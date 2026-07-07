import Stripe from "stripe";
import { env, requireStripeSecretKey, requireStripeWebhookSecret } from "@/lib/server/env";
import { formatTrailerType } from "@/lib/trailerTypes";
import {
	createStripeEvent,
	getBillingAccountByTenantId,
	getBillingInvoiceByStripeInvoiceId,
	getRentalById,
	getRentalByLastInvoiceId,
	getRentalByStripeSubscriptionId,
	getStripeEventByEventId,
	listBillingInvoicesByRentalId,
	listRentalsByTenantId,
	replaceBillingInvoiceLines,
	updateRental,
	updateStripeEvent,
	updateTenantStatus,
	updateTrailer,
	upsertBillingAccount,
	upsertBillingInvoice,
	type BillingInvoiceLineSource,
	type RentalRecord,
} from "@/lib/server/repos/platform";
import type { BillingStatus } from "@/lib/contracts/rentals";

const STRIPE_API_VERSION = "2026-02-25.clover";
const ACTIVE_RENTAL_STATUSES = new Set([
	"awaiting_first_payment",
	"active",
	"past_due",
	"suspended",
]);
const BILLING_LINE_SOURCES = new Set<BillingInvoiceLineSource>([
	"rental_charge",
	"deposit",
	"toll",
	"fee",
	"adjustment",
]);

let stripeClient: Stripe | null = null;

export class BillingOperationError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = "BillingOperationError";
		this.status = status;
	}
}

function stripe() {
	if (!stripeClient) {
		stripeClient = new Stripe(requireStripeSecretKey(), {
			apiVersion: STRIPE_API_VERSION as any,
		});
	}
	return stripeClient;
}

function appUrl(path: string) {
	const base = env.APP_BASE_URL.replace(/\/+$/, "");
	return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function toUnitAmount(value: number | null | undefined) {
	const numericValue = Number(value);
	if (!Number.isFinite(numericValue) || numericValue <= 0) {
		return 0;
	}
	return Math.round(numericValue * 100);
}

function fromUnitAmount(value: number | null | undefined) {
	const numericValue = Number(value);
	if (!Number.isFinite(numericValue)) {
		return 0;
	}
	return Number((numericValue / 100).toFixed(2));
}

function unixToIso(value: number | null | undefined) {
	if (!value) return null;
	return new Date(value * 1000).toISOString();
}

function unixToDateOnly(value: number | null | undefined) {
	if (!value) return null;
	return new Date(value * 1000).toISOString().slice(0, 10);
}

function normalizeStripeId(value: unknown) {
	if (!value) return null;
	if (typeof value === "string") return value;
	if (typeof value === "object" && "id" in value && typeof value.id === "string") {
		return value.id;
	}
	return null;
}

function getBillingInterval(frequency: RentalRecord["billing_frequency"]) {
	if (frequency === "weekly") return "week";
	if (frequency === "yearly") return "year";
	return "month";
}

function getRentalName(rental: RentalRecord) {
	const trailerCounts = new Map<string, number>();
	for (const assignment of rental.assignments ?? []) {
		if (assignment.status !== "active") continue;
		const trailerType = formatTrailerType(assignment.trailer?.trailer_type, "");
		if (!trailerType) continue;
		trailerCounts.set(trailerType, (trailerCounts.get(trailerType) ?? 0) + 1);
	}

	if (!trailerCounts.size) {
		for (const requested of rental.requested_trailer_types ?? []) {
			const requestedType = formatTrailerType(requested.trailer_type, "");
			const requestedCount = Number(requested.quantity);
			if (!requestedType) continue;
			trailerCounts.set(
				requestedType,
				(trailerCounts.get(requestedType) ?? 0) +
					(Number.isFinite(requestedCount) && requestedCount > 0
					? Math.floor(requestedCount)
					: 1)
			);
		}
	}

	if (!trailerCounts.size) {
		const requestedType = formatTrailerType(rental.requested_trailer_type, "");
		const requestedCount = Number(rental.requested_trailer_count);
		if (requestedType) {
			trailerCounts.set(
				requestedType,
				Number.isFinite(requestedCount) && requestedCount > 0
					? Math.floor(requestedCount)
					: 1
			);
		}
	}

	if (trailerCounts.size) {
		return [...trailerCounts.entries()]
			.map(([label, count]) => `${label} x ${count}`)
			.join(", ");
	}

	return "Rental Agreement";
}

function getStripeRentalDisplayName(rental: RentalRecord) {
	const tenantName = rental.tenant?.display_name || "D1 Trailers Customer";
	return `${tenantName}::${getRentalName(rental)}`;
}

function getTenantEmail(rental: RentalRecord) {
	return rental.tenant?.primary_email || rental.application?.primary_email || undefined;
}

function requireBillableRental(rental: RentalRecord) {
	if (!rental.tenant) {
		throw new BillingOperationError(409, "Rental is missing tenant details.");
	}

	if (rental.record_kind !== "agreement") {
		throw new BillingOperationError(409, "Only rental agreements can be billed.");
	}

	const rateAmount = toUnitAmount(rental.rate);
	if (rateAmount <= 0) {
		throw new BillingOperationError(400, "Rental billing requires a positive rate.");
	}
}

function mapStripeSubscriptionStatus(status: string | null | undefined): BillingStatus {
	switch (status) {
		case "active":
		case "trialing":
			return "active";
		case "past_due":
			return "past_due";
		case "unpaid":
			return "unpaid";
		case "canceled":
			return "cancelled";
		case "paused":
			return "suspended";
		case "incomplete":
		case "incomplete_expired":
			return "awaiting_first_payment";
		default:
			return "awaiting_first_payment";
	}
}

function mapRentalStatusFromBilling(billingStatus: BillingStatus) {
	if (billingStatus === "active") return "active";
	if (billingStatus === "past_due" || billingStatus === "unpaid") return "past_due";
	if (billingStatus === "suspended") return "suspended";
	if (billingStatus === "cancelled") return "cancelled";
	return "awaiting_first_payment";
}

async function syncTenantStatus(tenantId: string) {
	const rentals = await listRentalsByTenantId(tenantId);
	const liveAgreements = rentals.filter(
		(rental) =>
			rental.record_kind === "agreement" &&
			ACTIVE_RENTAL_STATUSES.has(rental.status)
	);

	const nextStatus = liveAgreements.some((rental) => rental.status === "suspended")
		? "suspended"
		: liveAgreements.length
			? "active"
			: "stale";

	await updateTenantStatus(tenantId, nextStatus);
}

async function syncAssignedTrailerStatuses(rental: RentalRecord, status: "reserved" | "rented" | "available") {
	const activeAssignments = (rental.assignments ?? []).filter(
		(assignment) => assignment.status === "active"
	);

	for (const assignment of activeAssignments) {
		await updateTrailer({
			trailerId: assignment.trailer_id,
			status,
		});
	}
}

async function ensureStripeCustomer(rental: RentalRecord) {
	const billingAccount = await getBillingAccountByTenantId(rental.tenant_id);
	const existingCustomerId =
		billingAccount?.stripe_customer_id || rental.stripe_customer_id || null;

	if (existingCustomerId) {
		if (!billingAccount?.stripe_customer_id) {
			await upsertBillingAccount({
				tenantId: rental.tenant_id,
				stripeCustomerId: existingCustomerId,
				defaultCurrency: env.STRIPE_DEFAULT_CURRENCY,
			});
		}
		return existingCustomerId;
	}

	const customer = await stripe().customers.create({
		email: getTenantEmail(rental),
		name: rental.tenant?.display_name || undefined,
		phone: rental.tenant?.primary_phone || undefined,
		metadata: {
			tenantId: rental.tenant_id,
			rentalId: rental.id,
		},
	});

	await upsertBillingAccount({
		tenantId: rental.tenant_id,
		stripeCustomerId: customer.id,
		defaultCurrency: env.STRIPE_DEFAULT_CURRENCY,
	});

	return customer.id;
}

async function ensureRentalProductAndPrice(rental: RentalRecord) {
	const productName = getStripeRentalDisplayName(rental);
	if (rental.stripe_product_id && rental.stripe_price_id) {
		await stripe().products.update(rental.stripe_product_id, {
			name: productName,
			metadata: {
				tenantId: rental.tenant_id,
				rentalId: rental.id,
				rentalName: getRentalName(rental),
			},
		});
		return {
			productId: rental.stripe_product_id,
			priceId: rental.stripe_price_id,
		};
	}

	const product = rental.stripe_product_id
		? await stripe().products.update(rental.stripe_product_id, {
				name: productName,
				metadata: {
					tenantId: rental.tenant_id,
					rentalId: rental.id,
					rentalName: getRentalName(rental),
				},
			})
		: await stripe().products.create({
				name: productName,
				metadata: {
					tenantId: rental.tenant_id,
					rentalId: rental.id,
					rentalName: getRentalName(rental),
				},
			});

	const price = await stripe().prices.create({
		currency: env.STRIPE_DEFAULT_CURRENCY,
		product: product.id,
		unit_amount: toUnitAmount(rental.rate),
		recurring: {
			interval: getBillingInterval(rental.billing_frequency),
		},
		metadata: {
			tenantId: rental.tenant_id,
			rentalId: rental.id,
			sourceType: "rental_charge",
		},
	});

	return {
		productId: product.id,
		priceId: price.id,
	};
}

async function persistInvoiceFromStripeInvoice(
	invoice: any,
	rental: RentalRecord | null
) {
	const stripeInvoiceId = normalizeStripeId(invoice);
	if (!stripeInvoiceId) return null;

	const tenantId =
		rental?.tenant_id ||
		(typeof invoice.metadata?.tenantId === "string" ? invoice.metadata.tenantId : null);
	if (!tenantId) return null;

	const stripeSubscriptionId =
		normalizeStripeId(invoice.subscription) ||
		normalizeStripeId(invoice.parent?.subscription_details?.subscription);
	const stripeCustomerId = normalizeStripeId(invoice.customer);
	const periodStart =
		unixToIso(invoice.period_start) ||
		unixToIso(invoice.lines?.data?.[0]?.period?.start);
	const periodEnd =
		unixToIso(invoice.period_end) ||
		unixToIso(invoice.lines?.data?.[0]?.period?.end);

	const mirroredInvoice = await upsertBillingInvoice({
		tenantId,
		rentalId: rental?.id ?? null,
		stripeInvoiceId,
		stripeCustomerId,
		stripeSubscriptionId,
		status: invoice.status || "unknown",
		billingReason: invoice.billing_reason ?? null,
		collectionMethod: invoice.collection_method ?? null,
		currency: invoice.currency || env.STRIPE_DEFAULT_CURRENCY,
		amountDue: fromUnitAmount(invoice.amount_due),
		amountPaid: fromUnitAmount(invoice.amount_paid),
		amountRemaining: fromUnitAmount(invoice.amount_remaining),
		hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
		invoicePdfUrl: invoice.invoice_pdf ?? null,
		periodStart,
		periodEnd,
		dueAt: unixToIso(invoice.due_date),
		paidAt: unixToIso(invoice.status_transitions?.paid_at),
		rawPayload: invoice,
	});

	const lines = Array.isArray(invoice.lines?.data) ? invoice.lines.data : [];
	await replaceBillingInvoiceLines({
		invoiceId: mirroredInvoice.id,
		lines: lines.map((line: any) => {
			const sourceTypeCandidate =
				line.metadata?.sourceType ||
				line.price?.metadata?.sourceType ||
				line.price?.product?.metadata?.sourceType;
			const sourceType = BILLING_LINE_SOURCES.has(
				sourceTypeCandidate as BillingInvoiceLineSource
			)
				? sourceTypeCandidate
				: String(line.description || "").toLowerCase().includes("deposit")
					? "deposit"
					: "rental_charge";

			return {
				tenantId,
				rentalId: rental?.id ?? null,
				stripeLineItemId: line.id ?? null,
				sourceType,
				description: line.description ?? null,
				amount: fromUnitAmount(line.amount),
				quantity:
					line.quantity === null || line.quantity === undefined
						? null
						: Number(line.quantity),
				currency: line.currency || invoice.currency || env.STRIPE_DEFAULT_CURRENCY,
				periodStart: unixToIso(line.period?.start),
				periodEnd: unixToIso(line.period?.end),
				metadata: {
					...(line.metadata ?? {}),
					priceId: normalizeStripeId(line.price),
				},
			};
		}),
	});

	return getBillingInvoiceByStripeInvoiceId(stripeInvoiceId);
}

async function resolveRentalFromStripeObject(stripeObject: any) {
	const metadataRentalId =
		typeof stripeObject.metadata?.rentalId === "string"
			? stripeObject.metadata.rentalId
			: typeof stripeObject.subscription_details?.metadata?.rentalId === "string"
				? stripeObject.subscription_details.metadata.rentalId
				: typeof stripeObject.parent?.subscription_details?.metadata?.rentalId === "string"
					? stripeObject.parent.subscription_details.metadata.rentalId
					: null;

	if (metadataRentalId) {
		const rental = await getRentalById(metadataRentalId);
		if (rental) return rental;
	}

	const subscriptionId =
		normalizeStripeId(stripeObject.subscription) ||
		normalizeStripeId(stripeObject.parent?.subscription_details?.subscription) ||
		(stripeObject.object === "subscription" ? stripeObject.id : null);

	if (subscriptionId) {
		const rental = await getRentalByStripeSubscriptionId(subscriptionId);
		if (rental) return rental;
	}

	const invoiceId = stripeObject.object === "invoice" ? stripeObject.id : null;
	if (invoiceId) {
		const rental = await getRentalByLastInvoiceId(invoiceId);
		if (rental) return rental;
	}

	return null;
}

async function syncRentalFromSubscription(
	subscription: any,
	rental: RentalRecord,
	latestInvoice?: any
) {
	const billingStatus = mapStripeSubscriptionStatus(subscription.status);
	const status = mapRentalStatusFromBilling(billingStatus);
	const currentPeriodEnd =
		unixToDateOnly(subscription.current_period_end) ||
		unixToDateOnly(subscription.items?.data?.[0]?.current_period_end) ||
		rental.current_period_end;
	const lastInvoiceId =
		normalizeStripeId(latestInvoice) ||
		normalizeStripeId(subscription.latest_invoice) ||
		rental.last_invoice_id;

	const updatedRental = await updateRental({
		rentalId: rental.id,
		recordKind: "agreement",
		status,
		billingStatus,
		stripeCustomerId: normalizeStripeId(subscription.customer) || rental.stripe_customer_id,
		stripeSubscriptionId: subscription.id,
		currentPeriodEnd,
		lastInvoiceId,
	});

	if (status === "active" || status === "past_due" || status === "suspended") {
		await syncAssignedTrailerStatuses(updatedRental, "rented");
	}

	if (status === "cancelled") {
		await syncAssignedTrailerStatuses(updatedRental, "available");
	}

	await syncTenantStatus(updatedRental.tenant_id);
	return updatedRental;
}

export async function activateRentalBilling(rentalId: string) {
	const rental = await getRentalById(rentalId);
	if (!rental) {
		throw new BillingOperationError(404, "Rental not found.");
	}

	requireBillableRental(rental);

	if (
		rental.stripe_subscription_id &&
		rental.billing_status !== "awaiting_first_payment"
	) {
		throw new BillingOperationError(
			409,
			"This rental already has active Stripe billing. Use Pay Now or Manage Billing instead."
		);
	}

	const stripeCustomerId = await ensureStripeCustomer(rental);
	const { productId, priceId } = await ensureRentalProductAndPrice(rental);

	const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
		{
			price: priceId,
			quantity: 1,
		},
	];
	const depositAmount = toUnitAmount(rental.deposit_amount);

	if (depositAmount > 0) {
		lineItems.push({
			price_data: {
				currency: env.STRIPE_DEFAULT_CURRENCY,
				unit_amount: depositAmount,
				product_data: {
					name: `${getStripeRentalDisplayName(rental)} Deposit`,
					metadata: {
						tenantId: rental.tenant_id,
						rentalId: rental.id,
						rentalName: getRentalName(rental),
						sourceType: "deposit",
					},
				},
			},
			quantity: 1,
		});
	}

	const session = await stripe().checkout.sessions.create({
		mode: "subscription",
		customer: stripeCustomerId,
		client_reference_id: rental.id,
		line_items: lineItems,
		success_url: appUrl(`/portal/billing?payment=success&rental=${rental.id}`),
		cancel_url: appUrl(`/portal/billing?payment=cancelled&rental=${rental.id}`),
		metadata: {
			action: "first_payment",
			tenantId: rental.tenant_id,
			rentalId: rental.id,
		},
		subscription_data: {
			metadata: {
				tenantId: rental.tenant_id,
				rentalId: rental.id,
				sourceType: "rental_charge",
			},
		},
	});

	await updateRental({
		rentalId: rental.id,
		recordKind: "agreement",
		status: "awaiting_first_payment",
		billingStatus: "awaiting_first_payment",
		stripeCustomerId,
		stripeProductId: productId,
		stripePriceId: priceId,
	});
	await syncAssignedTrailerStatuses(rental, "reserved");
	await syncTenantStatus(rental.tenant_id);

	return {
		url: session.url,
		sessionId: session.id,
		stripeCustomerId,
		stripeProductId: productId,
		stripePriceId: priceId,
		message: "Payment link is ready.",
	};
}

export async function createBillingPortalSessionForTenant(tenantId: string) {
	const billingAccount = await getBillingAccountByTenantId(tenantId);
	if (!billingAccount?.stripe_customer_id) {
		throw new BillingOperationError(404, "No Stripe customer exists for this account yet.");
	}

	const session = await stripe().billingPortal.sessions.create({
		customer: billingAccount.stripe_customer_id,
		return_url: appUrl("/portal/billing"),
	});

	return {
		url: session.url,
		message: "Billing portal is ready.",
	};
}

export async function createPayNowLinkForRental(rentalId: string, tenantId?: string | null) {
	const rental = await getRentalById(rentalId);
	if (!rental) {
		throw new BillingOperationError(404, "Rental not found.");
	}

	if (tenantId && rental.tenant_id !== tenantId) {
		throw new BillingOperationError(404, "Rental not found.");
	}

	if (rental.billing_status === "awaiting_first_payment") {
		return activateRentalBilling(rental.id);
	}

	const invoices = await listBillingInvoicesByRentalId(rental.id);
	const openInvoice = invoices.find((invoice) =>
		["open", "draft", "uncollectible"].includes(invoice.status)
	);
	if (openInvoice?.hosted_invoice_url) {
		return {
			url: openInvoice.hosted_invoice_url,
			message: "Invoice payment link is ready.",
		};
	}

	return createBillingPortalSessionForTenant(rental.tenant_id);
}

export async function cancelRentalBillingSubscription(rentalId: string) {
	const rental = await getRentalById(rentalId);
	if (!rental) {
		throw new BillingOperationError(404, "Rental not found.");
	}

	if (!rental.stripe_subscription_id) {
		return {
			cancelled: false,
			message: "No Stripe subscription is attached to this rental.",
		};
	}

	const currentSubscription = await stripe().subscriptions.retrieve(
		rental.stripe_subscription_id
	);
	if (currentSubscription.status === "canceled") {
		return {
			cancelled: false,
			message: "Stripe subscription was already cancelled.",
		};
	}

	await stripe().subscriptions.cancel(rental.stripe_subscription_id, {
		invoice_now: false,
		prorate: false,
	});

	return {
		cancelled: true,
		message: "Stripe subscription cancelled.",
	};
}

export async function createSurchargeInvoiceItem(input: {
	rentalId: string;
	description: string;
	amount: number;
	sourceType?: BillingInvoiceLineSource;
	metadata?: Record<string, string>;
}) {
	const rental = await getRentalById(input.rentalId);
	if (!rental) {
		throw new BillingOperationError(404, "Rental not found.");
	}

	if (!rental.stripe_customer_id || !rental.stripe_subscription_id) {
		throw new BillingOperationError(
			409,
			"Rental must have active Stripe billing before surcharge invoice items can be created."
		);
	}

	const sourceType = input.sourceType ?? "fee";
	return stripe().invoiceItems.create({
		customer: rental.stripe_customer_id,
		subscription: rental.stripe_subscription_id,
		currency: env.STRIPE_DEFAULT_CURRENCY,
		amount: toUnitAmount(input.amount),
		description: input.description,
		metadata: {
			tenantId: rental.tenant_id,
			rentalId: rental.id,
			sourceType,
			...(input.metadata ?? {}),
		},
	});
}

async function handleCheckoutSessionCompleted(session: any) {
	const rental = await resolveRentalFromStripeObject(session);
	if (!rental) return { status: "skipped" as const };

	const subscriptionId = normalizeStripeId(session.subscription);
	const subscription = subscriptionId
		? await stripe().subscriptions.retrieve(subscriptionId, {
				expand: ["latest_invoice", "items.data.price.product"],
			})
		: null;
	const latestInvoice = subscription?.latest_invoice;

	if (latestInvoice && typeof latestInvoice === "object") {
		await persistInvoiceFromStripeInvoice(latestInvoice, rental);
	}

	if (subscription) {
		await syncRentalFromSubscription(subscription, rental, latestInvoice);
	}

	return { status: "processed" as const, rentalId: rental.id };
}

async function handleInvoiceEvent(invoice: any, eventType: string) {
	let rental = await resolveRentalFromStripeObject(invoice);
	if (!rental) return { status: "skipped" as const };

	const mirroredInvoice = await persistInvoiceFromStripeInvoice(invoice, rental);
	const subscriptionId =
		normalizeStripeId(invoice.subscription) ||
		normalizeStripeId(invoice.parent?.subscription_details?.subscription);

	if (eventType === "invoice.paid") {
		if (subscriptionId) {
			const subscription = await stripe().subscriptions.retrieve(subscriptionId, {
				expand: ["latest_invoice", "items.data.price.product"],
			});
			rental = await syncRentalFromSubscription(subscription, rental, invoice);
		} else {
			rental = await updateRental({
				rentalId: rental.id,
				recordKind: "agreement",
				status: "active",
				billingStatus: "active",
				lastInvoiceId: invoice.id,
			});
			await syncAssignedTrailerStatuses(rental, "rented");
			await syncTenantStatus(rental.tenant_id);
		}
	}

	if (eventType === "invoice.payment_failed") {
		rental = await updateRental({
			rentalId: rental.id,
			status: "past_due",
			billingStatus: "past_due",
			lastInvoiceId: invoice.id,
		});
		await syncTenantStatus(rental.tenant_id);
	}

	return {
		status: "processed" as const,
		rentalId: rental.id,
		billingInvoiceId: mirroredInvoice?.id ?? null,
	};
}

async function handleSubscriptionEvent(subscription: any, deleted = false) {
	const rental = await resolveRentalFromStripeObject(subscription);
	if (!rental) return { status: "skipped" as const };

	const normalizedSubscription = deleted
		? { ...subscription, status: "canceled" }
		: subscription;
	const updatedRental = await syncRentalFromSubscription(
		normalizedSubscription,
		rental,
		typeof subscription.latest_invoice === "object" ? subscription.latest_invoice : null
	);

	return {
		status: "processed" as const,
		rentalId: updatedRental.id,
	};
}

export async function processStripeWebhook(input: {
	rawBody: string;
	signature: string | null;
}) {
	if (!input.signature) {
		throw new BillingOperationError(400, "Missing Stripe signature.");
	}

	const event = stripe().webhooks.constructEvent(
		input.rawBody,
		input.signature,
		requireStripeWebhookSecret()
	) as Stripe.Event;

	const existing = await getStripeEventByEventId(event.id);
	if (existing?.processing_status === "processed" || existing?.processing_status === "skipped") {
		return {
			received: true,
			duplicate: true,
			status: existing.processing_status,
		};
	}

	if (!existing) {
		await createStripeEvent({
			stripeEventId: event.id,
			eventType: event.type,
			rawPayload: event as unknown as Record<string, unknown>,
		});
	}

	try {
		let result:
			| { status: "processed" | "skipped"; rentalId?: string | null; billingInvoiceId?: string | null }
			| undefined;
		const stripeObject = event.data.object as any;

		switch (event.type) {
			case "checkout.session.completed":
				result = await handleCheckoutSessionCompleted(stripeObject);
				break;
			case "invoice.paid":
			case "invoice.payment_failed":
				result = await handleInvoiceEvent(stripeObject, event.type);
				break;
			case "customer.subscription.updated":
				result = await handleSubscriptionEvent(stripeObject);
				break;
			case "customer.subscription.deleted":
				result = await handleSubscriptionEvent(stripeObject, true);
				break;
			default:
				result = { status: "skipped" };
		}

		await updateStripeEvent({
			stripeEventId: event.id,
			processingStatus: result.status,
			rentalId: result.rentalId ?? null,
			billingInvoiceId: result.billingInvoiceId ?? null,
			processedAt: new Date().toISOString(),
			errorMessage: null,
		});

		return {
			received: true,
			status: result.status,
		};
	} catch (error) {
		await updateStripeEvent({
			stripeEventId: event.id,
			processingStatus: "failed",
			errorMessage: error instanceof Error ? error.message : "Unknown Stripe webhook error.",
		});
		throw error;
	}
}
