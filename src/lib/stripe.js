const STRIPE_API_BASE = "https://api.stripe.com/v1";
const DEFAULT_CURRENCY = (process.env.STRIPE_DEFAULT_CURRENCY || "usd").toLowerCase();
const STRIPE_TEMPORARILY_DISABLED_MESSAGE =
	"Stripe API calls are temporarily disabled until a valid STRIPE_SECRET_KEY is configured.";

function getStripeSecretKey() {
	const value = process.env.STRIPE_SECRET_KEY || "";
	if (!value.trim()) {
		throw new Error("STRIPE_SECRET_KEY is required for Stripe billing operations.");
	}
	return value.trim();
}

function toFormBody(params) {
	const body = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === "") continue;
		body.append(key, String(value));
	}
	return body;
}

async function stripeRequest(path, params) {
	const secretKey = getStripeSecretKey();
	const response = await fetch(`${STRIPE_API_BASE}${path}`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${secretKey}`,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: toFormBody(params),
		cache: "no-store",
	});

	const payload = await response.json().catch(() => ({}));
	if (!response.ok) {
		const message = payload?.error?.message || `Stripe request failed for ${path}`;
		throw new Error(message);
	}
	return payload;
}

function normalizeInterval(billingFrequency) {
	const normalized = String(billingFrequency || "Monthly").trim().toLowerCase();
	if (normalized === "weekly") {
		return { interval: "week", intervalCount: 1 };
	}
	if (normalized === "yearly" || normalized === "annual") {
		return { interval: "year", intervalCount: 1 };
	}
	return { interval: "month", intervalCount: 1 };
}

function toUnitAmount(rate) {
	const parsed = Number(rate);
	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new Error("Stripe price creation requires a valid non-negative rate.");
	}
	return Math.round(parsed * 100);
}

function toUnixTimestamp(dateOnlyValue) {
	if (!dateOnlyValue) return undefined;
	const parsed = new Date(`${dateOnlyValue}T00:00:00.000Z`);
	if (Number.isNaN(parsed.getTime())) return undefined;
	return Math.floor(parsed.getTime() / 1000);
}

function toPreviewCurrency(value) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function buildStripePreview({ customer, rental }) {
	return {
		customerId: customer.id || customer.recordId || null,
		customerEmail: customer.primaryEmail || null,
		stripeCustomerId: customer.stripeCustomerId || null,
		rentalId: rental.id || rental.recordId || null,
		stripeSubscriptionId: rental.stripe?.subscriptionId || null,
		stripePriceId: rental.stripe?.priceId || null,
		stripeProductId: rental.stripe?.productId || null,
		billingFrequency: rental.billingFrequency || "Monthly",
		rate: toPreviewCurrency(rental.rate),
		depositAmount: toPreviewCurrency(rental.depositAmount),
		contractStartDate: rental.contractStartDate || null,
		endDate: rental.endDate || null,
		billingStatus: rental.billingStatus || null,
	};
}

function buildDisabledStripeResponse(action, preview, extra = {}) {
	return {
		action,
		mode: "disabled",
		url: null,
		disabledReason: STRIPE_TEMPORARILY_DISABLED_MESSAGE,
		preview,
		...extra,
	};
}

export async function ensureStripeBillingRecords({
	customer,
	rental,
	rate,
	billingFrequency,
	contractStartDate,
}) {
	const companyName = customer.companyName || customer.primaryEmail || customer.id;
	const customerId = customer.id || customer.recordId;
	const rentalId = rental.id || rental.recordId;
	const metadata = {
		metadata_customer_id: customerId,
		metadata_rental_id: rentalId,
		metadata_contract_start_date: contractStartDate,
	};

	let stripeCustomerId = customer.stripeCustomerId || null;
	if (!stripeCustomerId) {
		const stripeCustomer = await stripeRequest("/customers", {
			email: customer.primaryEmail,
			name: companyName,
			description: `D1 Trailers customer ${customerId}`,
			...metadata,
		});
		stripeCustomerId = stripeCustomer.id;
	}

	let productId = rental.stripe?.productId || null;
	if (!productId) {
		const product = await stripeRequest("/products", {
			name: `${companyName} Rental ${rentalId}`,
			description: `Trailer rental for ${companyName}`,
			...metadata,
		});
		productId = product.id;
	}

	let priceId = rental.stripe?.priceId || null;
	if (!priceId) {
		const intervalConfig = normalizeInterval(billingFrequency);
		const price = await stripeRequest("/prices", {
			product: productId,
			currency: DEFAULT_CURRENCY,
			unit_amount: toUnitAmount(rate),
			"recurring[interval]": intervalConfig.interval,
			"recurring[interval_count]": intervalConfig.intervalCount,
			...metadata,
		});
		priceId = price.id;
	}

	let subscriptionId = rental.stripe?.subscriptionId || null;
	let subscription = null;
	if (!subscriptionId) {
		subscription = await stripeRequest("/subscriptions", {
			customer: stripeCustomerId,
			"items[0][price]": priceId,
			collection_method: "send_invoice",
			days_until_due: 1,
			proration_behavior: "none",
			billing_cycle_anchor: toUnixTimestamp(contractStartDate),
			...metadata,
		});
		subscriptionId = subscription.id;
	}

	return {
		stripeCustomerId,
		productId,
		priceId,
		subscriptionId,
		subscription,
	};
}

export async function createFirstPaymentLink({
	customer,
	rental,
	successUrl,
	cancelUrl,
}) {
	const preview = {
		...buildStripePreview({ customer, rental }),
		successUrl,
		cancelUrl,
	};

	return buildDisabledStripeResponse("first_payment", preview);

	/*
	const session = await stripeRequest("/checkout/sessions", {
		mode: "payment",
		success_url: successUrl,
		cancel_url: cancelUrl,
		customer: customer.stripeCustomerId,
		"line_items[0][price]": rental.stripe?.priceId,
		"line_items[0][quantity]": 1,
		"line_items[1][price_data][currency]": DEFAULT_CURRENCY,
		"line_items[1][price_data][product_data][name]": "Security Deposit",
		"line_items[1][price_data][unit_amount]": toUnitAmount(rental.depositAmount),
		"line_items[1][quantity]": 1,
	});

	return {
		action: "first_payment",
		mode: "live",
		url: session.url,
		sessionId: session.id,
		preview,
	};
	*/
}

export async function createBillingPortalLaunch({
	customer,
	returnUrl,
}) {
	const preview = {
		customerId: customer.id || customer.recordId || null,
		customerEmail: customer.primaryEmail || null,
		stripeCustomerId: customer.stripeCustomerId || null,
		returnUrl,
	};

	return buildDisabledStripeResponse("manage_billing", preview);

	/*
	const session = await stripeRequest("/billing_portal/sessions", {
		customer: customer.stripeCustomerId,
		return_url: returnUrl,
	});

	return {
		action: "manage_billing",
		mode: "live",
		url: session.url,
		sessionId: session.id,
		preview,
	};
	*/
}

export async function createOutstandingBalanceLink({
	customer,
	rental,
	successUrl,
	cancelUrl,
}) {
	const preview = {
		...buildStripePreview({ customer, rental }),
		successUrl,
		cancelUrl,
	};

	return buildDisabledStripeResponse("pay_now", preview);

	/*
	const invoice = await stripeRequest(`/invoices/${rental.stripe?.lastInvoiceId}/pay`, {});

	return {
		action: "pay_now",
		mode: "live",
		url: invoice.hosted_invoice_url,
		invoiceId: invoice.id,
		preview,
	};
	*/
}
