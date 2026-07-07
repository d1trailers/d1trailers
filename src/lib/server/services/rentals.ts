import {
	adminRentalCreateSchema,
	adminRentalUpdateSchema,
	rentalRequestCreateSchema,
	tenantRentalModificationSchema,
	adminTrailerCreateSchema,
	adminTrailerUpdateSchema,
	type BillingStatus,
	type RentalRequestOutcome,
	type RentalStatus,
	type TrailerStatus,
} from "@/lib/contracts/rentals";
import {
	canManageRentals,
	getMembershipPermissions,
	hasTenantPermission,
	type UserContext,
} from "@/lib/server/services/access";
import { cancelRentalBillingSubscription } from "@/lib/server/services/billing";
import {
	createAssignment,
	createRentalDocument,
	createRental,
	createTrailer,
	deleteRental,
	getApplicationById,
	getRentalByApplicationId,
	getRentalById,
	getTenantById,
	getTrailerById,
	listActiveAssignmentsByTrailerIds,
	listAllTimelineItemsByTenantId,
	listAdminRentals,
	listCommunicationEventsByTenantId,
	listRentalsByTenantId,
	listTimelineItemsByTenantId,
	listTrailers,
	replaceRentalRequestedTrailerTypes,
	updateAssignment,
	updateRental,
	updateTenantStatus,
	updateTrailer,
	upsertTimelineItemByKey,
	uploadRentalFile,
	type ApplicationRecord,
	type AssignmentRecord,
	type RentalRecord,
	type RentalDocumentRecord,
	type TrailerRecord,
} from "@/lib/server/repos/platform";
import { buildTenantRentalViews } from "@/lib/viewmodels/tenantWorkspace";

export class RentalOperationError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = "RentalOperationError";
		this.status = status;
	}
}

function parseNumericValue(value: unknown) {
	if (value === null || value === undefined || value === "") return null;
	const numericValue = Number(value);
	return Number.isFinite(numericValue) ? numericValue : null;
}

function areApprovedTermsLocked(rental: RentalRecord) {
	return (
		rental.record_kind === "agreement" ||
		["awaiting_first_payment", "active", "past_due", "suspended"].includes(
			rental.status
		)
	);
}

function normalizeRequestedTrailerTypeLines(
	lines: RentalRecord["requested_trailer_types"] | undefined,
	fallback?: {
		requested_trailer_type?: string | null;
		requested_trailer_count?: number | null;
	}
) {
	const normalized = (lines ?? [])
		.map((line, index) => ({
			trailerType: line.trailer_type,
			quantity: Number(line.quantity),
			sortOrder: line.sort_order ?? (index + 1) * 10,
		}))
		.filter(
			(line) =>
				line.trailerType &&
				Number.isFinite(line.quantity) &&
				line.quantity > 0
		);

	if (normalized.length) {
		return normalized;
	}

	if (fallback?.requested_trailer_type) {
		return [
			{
				trailerType: fallback.requested_trailer_type,
				quantity:
					Number.isFinite(Number(fallback.requested_trailer_count)) &&
					Number(fallback.requested_trailer_count) > 0
						? Number(fallback.requested_trailer_count)
						: 1,
				sortOrder: 10,
			},
		];
	}

	return [];
}

function getPrimaryRequestedTrailerType(
	lines: Array<{ trailerType: string; quantity: number }>
) {
	return lines[0] ?? null;
}

function areRequestedTrailerTypesDifferent(
	left: Array<{ trailerType: string; quantity: number }>,
	right: Array<{ trailerType: string; quantity: number }>
) {
	if (left.length !== right.length) return true;
	return left.some((leftItem, index) => {
		const rightItem = right[index];
		return (
			!rightItem ||
			leftItem.trailerType !== rightItem.trailerType ||
			leftItem.quantity !== rightItem.quantity
		);
	});
}

async function replaceRequestedTrailerTypesForRental(
	rentalId: string,
	requestedTrailerTypes: Array<{ trailerType: string; quantity: number }>
) {
	return replaceRentalRequestedTrailerTypes({
		rentalId,
		requestedTrailerTypes: requestedTrailerTypes.map((item, index) => ({
			...item,
			sortOrder: (index + 1) * 10,
		})),
	});
}

function hasPaidBillingActivity(rental: RentalRecord) {
	return (rental.billing_invoices ?? []).some(
		(invoice) =>
			invoice.status === "paid" ||
			Boolean(invoice.paid_at) ||
			Number(invoice.amount_paid ?? 0) > 0
	);
}

function hasBillingSensitiveTenantChange(
	rental: RentalRecord,
	input: ReturnType<typeof tenantRentalModificationSchema.parse>
) {
	const approvedTermsLocked = areApprovedTermsLocked(rental);
	return (
		(!approvedTermsLocked &&
			input.billingFrequency &&
			input.billingFrequency !== rental.billing_frequency) ||
		(!approvedTermsLocked &&
			input.contractStartDate !== null &&
			input.contractStartDate !== rental.contract_start_date) ||
		(input.operationalStartDate !== null &&
			input.operationalStartDate !== rental.operational_start_date) ||
		(input.endDate !== null && input.endDate !== rental.end_date) ||
		areRequestedTrailerTypesDifferent(
			normalizeRequestedTrailerTypeLines(rental.requested_trailer_types, rental),
			input.requestedTrailerTypes
		)
	);
}

async function flagBillingCreditReviewIfNeeded(input: {
	rental: RentalRecord;
	userId: string;
	changes: ReturnType<typeof tenantRentalModificationSchema.parse>;
}) {
	if (
		input.rental.record_kind !== "agreement" ||
		!hasPaidBillingActivity(input.rental) ||
		!hasBillingSensitiveTenantChange(input.rental, input.changes)
	) {
		return;
	}

	await upsertTimelineItemByKey({
		tenantId: input.rental.tenant_id,
		rentalId: input.rental.id,
		itemKey: "billing_credit_review",
		type: "action_required",
		stage: "current",
		sortOrder: 35,
		title: "Review billing credit",
		description:
			"This paid rental has customer-requested changes that may affect billing. Review existing payments and credit applicable amounts toward the revised rental term before final approval.",
		visibleToTenant: false,
		metadata: {
			source: "tenant_change_request",
			changedAt: new Date().toISOString(),
			changedByProfileId: input.userId,
			previous: {
				billingFrequency: input.rental.billing_frequency,
				contractStartDate: input.rental.contract_start_date,
				operationalStartDate: input.rental.operational_start_date,
				endDate: input.rental.end_date,
				requestedTrailerTypes: normalizeRequestedTrailerTypeLines(
					input.rental.requested_trailer_types,
					input.rental
				),
			},
			requested: {
				billingFrequency:
					input.changes.billingFrequency ?? input.rental.billing_frequency,
				contractStartDate:
					input.changes.contractStartDate ?? input.rental.contract_start_date,
				operationalStartDate:
					input.changes.operationalStartDate ??
					input.rental.operational_start_date,
				endDate: input.changes.endDate ?? input.rental.end_date,
				requestedTrailerTypes: input.changes.requestedTrailerTypes,
			},
		},
		createdByProfileId: input.userId,
		updatedByProfileId: input.userId,
	});
}

function formatTenantName(rental: RentalRecord) {
	return rental.tenant?.display_name ?? null;
}

function mapAssignment(assignment: AssignmentRecord) {
	return {
		id: assignment.id,
		rentalId: assignment.rental_id,
		trailerId: assignment.trailer_id,
		status: assignment.status,
		startDate: assignment.start_date,
		endDate: assignment.end_date,
		notes: assignment.notes,
		createdAt: assignment.created_at,
		updatedAt: assignment.updated_at,
		trailer: assignment.trailer ? mapTrailer(assignment.trailer, false) : null,
	};
}

function mapTimelineItem(item: NonNullable<ApplicationRecord["timeline_items"]>[number]) {
	return {
		id: item.id,
		rentalId: item.rental_id ?? item.metadata?.rentalId ?? null,
		applicationId: item.application_id ?? null,
		type: item.type,
		itemKey: item.item_key,
		stage: item.stage,
		title: item.title,
		description: item.description,
		visibleToTenant: item.visible_to_tenant,
		dueAt: item.due_at,
		completedAt: item.completed_at,
		ctaLabel: item.cta_label,
		ctaUrl: item.cta_url,
		metadata: item.metadata ?? {},
		createdAt: item.created_at,
	};
}

function mapApplicationDocument(
	document: NonNullable<ApplicationRecord["documents"]>[number]
) {
	return {
		id: document.id,
		source: "application",
		applicationId: document.application_id,
		fileName: document.file_name,
		documentType: document.document_type,
		category: document.category,
		contentType: document.content_type,
		createdAt: document.created_at,
		signedUrl: document.signed_url ?? null,
	};
}

function mapRentalDocument(document: RentalDocumentRecord) {
	return {
		id: document.id,
		source: "rental",
		rentalId: document.rental_id,
		fileName: document.file_name,
		documentType: document.document_type,
		category: document.category,
		contentType: document.content_type,
		createdAt: document.created_at,
		signedUrl: document.signed_url ?? null,
	};
}

function mapBillingInvoiceLine(line: any) {
	return {
		id: line.id,
		invoiceId: line.invoice_id,
		rentalId: line.rental_id,
		stripeLineItemId: line.stripe_line_item_id,
		sourceType: line.source_type,
		description: line.description,
		amount: parseNumericValue(line.amount),
		quantity: parseNumericValue(line.quantity),
		currency: line.currency,
		periodStart: line.period_start,
		periodEnd: line.period_end,
		metadata: line.metadata ?? {},
		createdAt: line.created_at,
	};
}

function mapBillingInvoice(invoice: any) {
	return {
		id: invoice.id,
		tenantId: invoice.tenant_id,
		rentalId: invoice.rental_id,
		stripeInvoiceId: invoice.stripe_invoice_id,
		stripeCustomerId: invoice.stripe_customer_id,
		stripeSubscriptionId: invoice.stripe_subscription_id,
		status: invoice.status,
		billingReason: invoice.billing_reason,
		collectionMethod: invoice.collection_method,
		currency: invoice.currency,
		amountDue: parseNumericValue(invoice.amount_due),
		amountPaid: parseNumericValue(invoice.amount_paid),
		amountRemaining: parseNumericValue(invoice.amount_remaining),
		hostedInvoiceUrl: invoice.hosted_invoice_url,
		invoicePdfUrl: invoice.invoice_pdf_url,
		periodStart: invoice.period_start,
		periodEnd: invoice.period_end,
		dueAt: invoice.due_at,
		paidAt: invoice.paid_at,
		createdAt: invoice.created_at,
		lines: Array.isArray(invoice.lines)
			? invoice.lines.map(mapBillingInvoiceLine)
			: [],
	};
}

function mapApplication(application: ApplicationRecord) {
	return {
		id: application.id,
		status: application.status,
		companyName: application.company_name,
		primaryEmail: application.primary_email,
		primaryPhone: application.primary_phone,
		ownerFirstName: application.owner_first_name,
		ownerLastName: application.owner_last_name,
		billingFrequency: application.billing_frequency,
		rentalDuration: application.rental_duration,
		intendedUse: application.intended_use,
		reviewNotes: application.review_notes,
		submittedAt: application.submitted_at,
		reviewedAt: application.reviewed_at,
		payload: application.payload ?? {},
		documents: Array.isArray(application.documents)
			? application.documents.map(mapApplicationDocument)
			: [],
		timelineItems: Array.isArray(application.timeline_items)
			? application.timeline_items.map(mapTimelineItem)
			: [],
	};
}

export function mapTrailer(trailer: TrailerRecord, includeAssignments = true) {
	const assignments = Array.isArray(trailer.assignments)
		? trailer.assignments.map((assignment) => ({
				id: assignment.id,
				rentalId: assignment.rental_id,
				status: assignment.status,
				startDate: assignment.start_date,
				endDate: assignment.end_date,
				rentalStatus: assignment.rental?.status ?? null,
				tenantName: assignment.rental?.tenant?.display_name ?? null,
		  }))
		: [];

	return {
		id: trailer.id,
		trailerCode: trailer.trailer_code || "",
		trailerType: trailer.trailer_type || "",
		plateNumber: trailer.plate_number || "",
		vin: trailer.vin || "",
		status: trailer.status,
		createdAt: trailer.created_at,
		updatedAt: trailer.updated_at,
		activeAssignmentCount: assignments.filter((assignment) => assignment.status === "active")
			.length,
		assignments: includeAssignments ? assignments : undefined,
	};
}

export function mapRental(rental: RentalRecord) {
	const assignments = Array.isArray(rental.assignments)
		? rental.assignments.map(mapAssignment)
		: [];
	const requestedTrailerTypes = normalizeRequestedTrailerTypeLines(
		rental.requested_trailer_types,
		rental
	);
	const primaryRequestedTrailerType =
		getPrimaryRequestedTrailerType(requestedTrailerTypes);
	return {
		id: rental.id,
		tenantId: rental.tenant_id,
		tenantName: formatTenantName(rental),
		applicationId: rental.application_id,
		status: rental.status,
		billingStatus: rental.billing_status,
		billingFrequency: rental.billing_frequency,
		rate: parseNumericValue(rental.rate),
		depositAmount: parseNumericValue(rental.deposit_amount),
		contractStartDate: rental.contract_start_date,
		operationalStartDate: rental.operational_start_date,
		endDate: rental.end_date,
		recordKind: rental.record_kind,
		requestKind: rental.request_kind,
		requestedTrailerTypes,
		requestedTrailerCount:
			primaryRequestedTrailerType?.quantity ?? rental.requested_trailer_count,
		requestedTrailerType:
			primaryRequestedTrailerType?.trailerType ?? rental.requested_trailer_type,
		requestSummary: rental.request_summary,
		requestedByProfileId: rental.requested_by_profile_id,
		parentRentalId: rental.parent_rental_id,
		parentRental: rental.parent_rental
			? {
					id: rental.parent_rental.id,
					status: rental.parent_rental.status,
					recordKind: rental.parent_rental.record_kind,
					contractStartDate: rental.parent_rental.contract_start_date,
					endDate: rental.parent_rental.end_date,
			  }
			: null,
		requestOutcome: rental.request_outcome,
		resolvedAt: rental.resolved_at,
		createdAt: rental.created_at,
		updatedAt: rental.updated_at,
		application: rental.application ? mapApplication(rental.application) : null,
		currentPeriodEnd: rental.current_period_end,
		lastInvoiceId: rental.last_invoice_id,
		stripe: {
			customerId: rental.stripe_customer_id,
			subscriptionId: rental.stripe_subscription_id,
			priceId: rental.stripe_price_id,
			productId: rental.stripe_product_id,
		},
		documents: Array.isArray(rental.documents)
			? rental.documents.map(mapRentalDocument)
			: [],
		billingInvoices: Array.isArray(rental.billing_invoices)
			? rental.billing_invoices.map(mapBillingInvoice)
			: [],
		assignments,
		trailers: assignments
			.map((assignment) => assignment.trailer)
			.filter(Boolean),
		canDelete:
			rental.record_kind === "request" &&
			rental.status === "draft" &&
			!rental.resolved_at &&
			assignments.length === 0,
	};
}

function ensureTenantContext(context: UserContext) {
	const membership = context.activeTenantMembership;
	if (!membership) {
		throw new RentalOperationError(403, "No tenant account is selected.");
	}
	return membership;
}

function ensureCanManageRentals(context: UserContext) {
	const membership = ensureTenantContext(context);
	if (!canManageRentals(membership)) {
		throw new RentalOperationError(
			403,
			"You do not have permission to manage rentals for this account."
		);
	}
	return membership;
}

function ensureCanViewOrManageRentals(context: UserContext) {
	const membership = ensureTenantContext(context);
	if (
		!hasTenantPermission(membership, "view_rentals") &&
		!canManageRentals(membership)
	) {
		throw new RentalOperationError(
			403,
			"You do not have permission to view rentals for this account."
		);
	}
	return membership;
}

function isClosedRentalStatus(status: RentalStatus) {
	return ["returned", "declined", "cancelled"].includes(status);
}

function isLiveAgreementStatus(status: RentalStatus) {
	return [
		"awaiting_first_payment",
		"customer_review",
		"changes_pending",
		"active",
		"past_due",
		"suspended",
	].includes(status);
}

function deriveAgreementOperationalStatus(
	billingStatus: BillingStatus,
	fallbackStatus: RentalStatus
): RentalStatus {
	if (billingStatus === "awaiting_first_payment") return "awaiting_first_payment";
	if (billingStatus === "past_due") return "past_due";
	if (billingStatus === "suspended") return "suspended";
	if (billingStatus === "cancelled") return "cancelled";
	if (billingStatus === "active") return "active";
	if (billingStatus === "unpaid") return "past_due";
	return fallbackStatus === "customer_review" || fallbackStatus === "changes_pending"
		? "active"
		: fallbackStatus;
}

function getTrailerLifecycleStatus(rental: Pick<RentalRecord, "record_kind" | "status" | "billing_status">): TrailerStatus {
	if (rental.record_kind === "agreement") {
		return deriveAgreementOperationalStatus(
			rental.billing_status,
			rental.status
		) === "awaiting_first_payment"
			? "reserved"
			: "rented";
	}

	if (["active", "past_due", "suspended"].includes(rental.status)) {
		return "rented";
	}

	return "reserved";
}

async function syncTenantStatusFromRentals(tenantId: string) {
	const rentals = await listRentalsByTenantId(tenantId);
	const liveAgreements = rentals.filter(
		(rental) => rental.record_kind === "agreement" && isLiveAgreementStatus(rental.status)
	);

	const nextStatus = liveAgreements.some((rental) => rental.status === "suspended")
		? "suspended"
		: liveAgreements.length
			? "active"
			: "stale";

	await updateTenantStatus(tenantId, nextStatus);
}

async function ensureTrailerConflictsClear(
	trailerIds: string[],
	targetRentalId: string
) {
	const activeAssignments = await listActiveAssignmentsByTrailerIds(trailerIds);
	const blockingAssignment = activeAssignments.find(
		(assignment) => assignment.rental_id !== targetRentalId
	);

	if (blockingAssignment) {
		throw new RentalOperationError(
			409,
			"One of the selected trailers is already assigned to another active rental."
		);
	}
}

async function resolveAdminRentalTenantId(
	rental: RentalRecord,
	tenantId?: string
) {
	if (!tenantId || tenantId === rental.tenant_id) {
		return rental.tenant_id;
	}

	if (rental.application_id || rental.parent_rental_id) {
		throw new RentalOperationError(
			409,
			"This rental stays attached to its current tenant because it is linked to an application or parent rental."
		);
	}

	const tenant = await getTenantById(tenantId);
	if (!tenant) {
		throw new RentalOperationError(404, "Tenant not found.");
	}

	return tenant.id;
}

async function attachTrailersToRental(input: {
	rental: RentalRecord;
	trailerIds: string[];
	startDate?: string | null;
	endDate?: string | null;
	notes?: string | null;
}) {
	const uniqueTrailerIds = [...new Set(input.trailerIds.filter(Boolean))];
	if (!uniqueTrailerIds.length) {
		return;
	}

	if (isClosedRentalStatus(input.rental.status)) {
		throw new RentalOperationError(
			409,
			"Closed rentals cannot receive trailer assignments."
		);
	}

	await ensureTrailerConflictsClear(uniqueTrailerIds, input.rental.id);

	const existingActiveAssignments = new Set(
		(input.rental.assignments ?? [])
			.filter((assignment) => assignment.status === "active")
			.map((assignment) => assignment.trailer_id)
	);
	const trailerIdsToCreate = uniqueTrailerIds.filter(
		(trailerId) => !existingActiveAssignments.has(trailerId)
	);

	for (const trailerId of trailerIdsToCreate) {
		await createAssignment({
			rentalId: input.rental.id,
			trailerId,
			status: "active",
			startDate:
				input.startDate ?? input.rental.contract_start_date ?? input.rental.operational_start_date,
			endDate: input.endDate ?? input.rental.end_date ?? null,
			notes: input.notes ?? null,
		});

		await updateTrailer({
			trailerId,
			status: getTrailerLifecycleStatus(input.rental),
		});
	}
}

async function releaseActiveAssignments(rental: RentalRecord) {
	const activeAssignments = (rental.assignments ?? []).filter(
		(assignment) => assignment.status === "active"
	);

	for (const assignment of activeAssignments) {
		await updateAssignment({
			assignmentId: assignment.id,
			status: "cancelled",
			notes: assignment.notes ?? "Released when rental request was closed.",
		});

		await updateTrailer({
			trailerId: assignment.trailer_id,
			status: "available",
		});
	}
}

async function syncTrailerStatusAfterAssignmentChange(trailerId: string) {
	const trailer = await getTrailerById(trailerId);
	if (!trailer) {
		throw new RentalOperationError(404, "Trailer not found.");
	}

	const activeAssignments = (trailer.assignments ?? []).filter(
		(assignment) => assignment.status === "active"
	);
	if (!activeAssignments.length) {
		await updateTrailer({
			trailerId,
			status: "available",
		});
		return;
	}

	const hasLiveAgreement = activeAssignments.some((assignment) =>
		assignment.rental?.record_kind === "agreement" &&
		isLiveAgreementStatus(assignment.rental?.status ?? "draft")
	);

	await updateTrailer({
		trailerId,
		status: hasLiveAgreement ? "rented" : "reserved",
	});
}

async function resolveOrCreateInitialApplicationRental(application: ApplicationRecord) {
	const existingRental = await getRentalByApplicationId(application.id);
	if (existingRental) {
		return existingRental;
	}

	return createRental({
		tenantId: application.tenant_id,
		applicationId: application.id,
		recordKind: "request",
		requestKind: "initial_application",
		status: "draft",
		billingStatus: "draft",
		billingFrequency: application.billing_frequency,
		requestSummary: application.rental_duration,
	});
}

export async function syncRentalAfterApplicationSubmission(input: {
	tenantId: string;
	applicationId: string;
	billingFrequency?: "weekly" | "monthly" | "yearly";
	rentalDuration?: string | null;
}) {
	const rental = await createRental({
		tenantId: input.tenantId,
		applicationId: input.applicationId,
		recordKind: "request",
		requestKind: "initial_application",
		status: "draft",
		billingStatus: "draft",
		billingFrequency: input.billingFrequency ?? "monthly",
		requestSummary: input.rentalDuration ?? null,
	});

	await syncTenantStatusFromRentals(input.tenantId);
	return rental;
}

export async function syncRentalAfterApplicationReview(input: {
	applicationId: string;
	nextStatus: "under_review" | "feedback_requested" | "approved" | "closed";
}) {
	const application = await getApplicationById(input.applicationId);
	if (!application) {
		throw new RentalOperationError(404, "Application not found.");
	}

	const rental = await resolveOrCreateInitialApplicationRental(application);

	if (input.nextStatus === "approved") {
		const updatedRental = await updateRental({
			rentalId: rental.id,
			recordKind: "request",
			requestOutcome: null,
			resolvedAt: null,
			status: "customer_review",
			billingStatus: "draft",
		});
		await syncTenantStatusFromRentals(updatedRental.tenant_id);
		return updatedRental;
	}

	if (input.nextStatus === "closed") {
		const updatedRental = await updateRental({
			rentalId: rental.id,
			recordKind: "request",
			requestOutcome: "denied",
			resolvedAt: new Date().toISOString(),
			status: "declined",
			billingStatus: "cancelled",
		});
		await syncTenantStatusFromRentals(updatedRental.tenant_id);
		return updatedRental;
	}

	const updatedRental = await updateRental({
		rentalId: rental.id,
		recordKind: "request",
		requestOutcome: null,
		resolvedAt: null,
		status: "draft",
		billingStatus: "draft",
	});
	await syncTenantStatusFromRentals(updatedRental.tenant_id);
	return updatedRental;
}

export async function listAccountRentals(context: UserContext) {
	const membership = ensureCanViewOrManageRentals(context);
	const rentals = await listRentalsByTenantId(membership.tenant_id);

	return {
		tenant: {
			id: membership.tenant.id,
			name: membership.tenant.display_name,
			status: membership.tenant.status,
			permissions: getMembershipPermissions(membership),
		},
		rentals: rentals.map(mapRental),
	};
}

export async function createAccountRentalRequest(context: UserContext, rawInput: unknown) {
	const membership = ensureCanManageRentals(context);
	const input = rentalRequestCreateSchema.parse(rawInput);

	if (input.parentRentalId) {
		const parentRental = await getRentalById(input.parentRentalId);
		if (!parentRental || parentRental.tenant_id !== membership.tenant_id) {
			throw new RentalOperationError(404, "The selected rental was not found.");
		}

		if (parentRental.record_kind !== "agreement") {
			throw new RentalOperationError(
				409,
				"Only active rental agreements can be expanded."
			);
		}

		if (["returned", "cancelled"].includes(parentRental.status)) {
			throw new RentalOperationError(
				409,
				"Closed rental agreements cannot be expanded."
			);
		}
	}

	const primaryRequestedTrailerType = getPrimaryRequestedTrailerType(
		input.requestedTrailerTypes
	);
	const rental = await createRental({
		tenantId: membership.tenant_id,
		recordKind: "request",
		requestKind: input.requestType,
		parentRentalId: input.parentRentalId,
		status: "draft",
		billingStatus: "draft",
		billingFrequency: input.billingFrequency,
		contractStartDate: input.contractStartDate,
		operationalStartDate: input.operationalStartDate,
		endDate: input.endDate,
		requestedTrailerCount: primaryRequestedTrailerType?.quantity ?? null,
		requestedTrailerType: primaryRequestedTrailerType?.trailerType ?? null,
		requestSummary: input.requestSummary,
		requestedByProfileId: context.userId,
	});

	await replaceRequestedTrailerTypesForRental(rental.id, input.requestedTrailerTypes);
	const refreshedRental = await getRentalById(rental.id);

	await syncTenantStatusFromRentals(membership.tenant_id);

	return mapRental(refreshedRental ?? rental);
}

export async function submitAccountRentalModification(
	context: UserContext,
	rentalId: string,
	rawInput: unknown
) {
	const membership = ensureCanManageRentals(context);
	const rental = await getRentalById(rentalId);

	if (!rental || rental.tenant_id !== membership.tenant_id) {
		throw new RentalOperationError(404, "The selected rental was not found.");
	}

	if (isClosedRentalStatus(rental.status)) {
		throw new RentalOperationError(409, "Closed rentals cannot be modified.");
	}

	const action =
		typeof rawInput === "object" &&
		rawInput !== null &&
		"action" in rawInput &&
		typeof rawInput.action === "string"
			? rawInput.action
			: "save_changes";
	const input = tenantRentalModificationSchema.parse(rawInput);
	const primaryRequestedTrailerType = getPrimaryRequestedTrailerType(
		input.requestedTrailerTypes
	);
	const requestSummary = input.requestSummary?.trim() || null;
	const approvedTermsLocked = areApprovedTermsLocked(rental);
	const nextBillingFrequency = approvedTermsLocked
		? rental.billing_frequency
		: input.billingFrequency ?? rental.billing_frequency;
	const nextContractStartDate = approvedTermsLocked
		? rental.contract_start_date
		: input.contractStartDate ?? rental.contract_start_date;

	if (action === "approve_draft") {
		if (rental.status !== "customer_review") {
			throw new RentalOperationError(
				409,
				"Only customer-review proposals can be approved."
			);
		}

		const approvedRental =
			rental.record_kind === "request"
				? await updateRental({
						rentalId: rental.id,
						recordKind: "agreement",
						requestOutcome: "approved_as_agreement",
						resolvedAt: new Date().toISOString(),
						status: "awaiting_first_payment",
						billingStatus: "awaiting_first_payment",
						billingFrequency: nextBillingFrequency,
						contractStartDate: nextContractStartDate,
						operationalStartDate:
							input.operationalStartDate ?? rental.operational_start_date,
						endDate: input.endDate ?? rental.end_date,
						requestedTrailerCount:
							primaryRequestedTrailerType?.quantity ??
							rental.requested_trailer_count,
						requestedTrailerType:
							primaryRequestedTrailerType?.trailerType ??
							rental.requested_trailer_type,
						requestSummary: requestSummary ?? rental.request_summary,
				  })
				: await updateRental({
						rentalId: rental.id,
						recordKind: "agreement",
						requestOutcome: rental.request_outcome,
						resolvedAt: rental.resolved_at,
						status: deriveAgreementOperationalStatus(
							rental.billing_status,
							rental.status
						),
						billingStatus: rental.billing_status,
						billingFrequency: nextBillingFrequency,
						contractStartDate: nextContractStartDate,
						operationalStartDate:
							input.operationalStartDate ?? rental.operational_start_date,
						endDate: input.endDate ?? rental.end_date,
						requestedTrailerCount:
							primaryRequestedTrailerType?.quantity ??
							rental.requested_trailer_count,
						requestedTrailerType:
							primaryRequestedTrailerType?.trailerType ??
							rental.requested_trailer_type,
						requestSummary: requestSummary ?? rental.request_summary,
				  });

		await replaceRequestedTrailerTypesForRental(
			approvedRental.id,
			input.requestedTrailerTypes
		);
		await syncTenantStatusFromRentals(approvedRental.tenant_id);
		const refreshedApprovedRental = await getRentalById(approvedRental.id);
		return mapRental(refreshedApprovedRental ?? approvedRental);
	}

	if (action === "decline_draft") {
		if (rental.status !== "customer_review") {
			throw new RentalOperationError(
				409,
				"Only customer-review proposals can be declined."
			);
		}

		await releaseActiveAssignments(rental);

		const declinedRental = await updateRental({
			rentalId: rental.id,
			recordKind: "request",
			requestOutcome: "denied",
			resolvedAt: new Date().toISOString(),
			status: "declined",
			billingStatus: "cancelled",
		});

		await syncTenantStatusFromRentals(declinedRental.tenant_id);
		return mapRental(declinedRental);
	}

	if (action === "cancel_rental") {
		if (rental.stripe_subscription_id) {
			await cancelRentalBillingSubscription(rental.id);
		}

		await releaseActiveAssignments(rental);

		const cancelledRental = await updateRental({
			rentalId: rental.id,
			status: "cancelled",
			billingStatus: "cancelled",
			requestOutcome:
				rental.record_kind === "request"
					? "cancelled"
					: rental.request_outcome,
			resolvedAt: new Date().toISOString(),
		});

		await syncTenantStatusFromRentals(cancelledRental.tenant_id);
		return mapRental(cancelledRental);
	}

	await flagBillingCreditReviewIfNeeded({
		rental,
		userId: context.userId,
		changes: input,
	});

	const updatedRental = await updateRental({
		rentalId: rental.id,
		recordKind: rental.record_kind,
		requestOutcome: rental.record_kind === "request" ? null : rental.request_outcome,
		resolvedAt: rental.record_kind === "request" ? null : rental.resolved_at,
		status: "changes_pending",
		billingStatus: rental.billing_status,
		billingFrequency: nextBillingFrequency,
		contractStartDate: nextContractStartDate,
		operationalStartDate:
			input.operationalStartDate ?? rental.operational_start_date,
		endDate: input.endDate ?? rental.end_date,
		requestedTrailerCount:
			primaryRequestedTrailerType?.quantity ?? rental.requested_trailer_count,
		requestedTrailerType:
			primaryRequestedTrailerType?.trailerType ?? rental.requested_trailer_type,
		requestSummary: requestSummary ?? rental.request_summary,
		requestedByProfileId: context.userId,
	});

	await replaceRequestedTrailerTypesForRental(
		updatedRental.id,
		input.requestedTrailerTypes
	);
	await syncTenantStatusFromRentals(updatedRental.tenant_id);
	const refreshedUpdatedRental = await getRentalById(updatedRental.id);
	return mapRental(refreshedUpdatedRental ?? updatedRental);
}

const MAX_RENTAL_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_RENTAL_DOCUMENT_TYPES = new Set([
	"application/pdf",
	"image/jpeg",
	"image/png",
	"image/webp",
]);

function parseRentalDocumentForm(formData: FormData) {
	const rawFile = formData.get("file");
	if (!(rawFile instanceof File) || !rawFile.name) {
		throw new RentalOperationError(400, "A document file is required.");
	}

	if (rawFile.size > MAX_RENTAL_DOCUMENT_SIZE_BYTES) {
		throw new RentalOperationError(400, "Documents must be 5 MB or smaller.");
	}

	if (rawFile.type && !ALLOWED_RENTAL_DOCUMENT_TYPES.has(rawFile.type)) {
		throw new RentalOperationError(
			400,
			"Documents must be a PDF, JPG, PNG, or WebP file."
		);
	}

	const documentType = String(formData.get("documentType") ?? "")
		.trim()
		.toLowerCase();
	if (!documentType) {
		throw new RentalOperationError(400, "A document type is required.");
	}

	const category = String(formData.get("category") ?? "").trim() || null;

	return {
		file: rawFile,
		documentType,
		category,
	};
}

export async function uploadAccountRentalDocument(
	context: UserContext,
	rentalId: string,
	formData: FormData
) {
	const membership = ensureCanManageRentals(context);
	const rental = await getRentalById(rentalId);

	if (!rental || rental.tenant_id !== membership.tenant_id) {
		throw new RentalOperationError(404, "The selected rental was not found.");
	}

	const input = parseRentalDocumentForm(formData);
	const storagePath = await uploadRentalFile({
		rentalId,
		file: input.file,
	});

	return createRentalDocument({
		rentalId,
		bucket: "application-documents",
		storagePath,
		fileName: input.file.name,
		contentType: input.file.type,
		category: input.category,
		documentType: input.documentType,
		createdByProfileId: context.userId,
	});
}

export async function uploadAdminRentalDocument(rentalId: string, formData: FormData) {
	const rental = await getRentalById(rentalId);
	if (!rental) {
		throw new RentalOperationError(404, "Rental not found.");
	}

	const input = parseRentalDocumentForm(formData);
	const storagePath = await uploadRentalFile({
		rentalId,
		file: input.file,
	});

	return createRentalDocument({
		rentalId,
		bucket: "application-documents",
		storagePath,
		fileName: input.file.name,
		contentType: input.file.type,
		category: input.category,
		documentType: input.documentType,
	});
}

async function removeRentalAssignmentCore(input: {
	rentalId: string;
	assignmentId: string;
	tenantId?: string;
	actor: "admin" | "tenant";
}) {
	const rental = await getRentalById(input.rentalId);
	if (!rental) {
		throw new RentalOperationError(404, "Rental not found.");
	}

	if (input.tenantId && rental.tenant_id !== input.tenantId) {
		throw new RentalOperationError(404, "The selected rental was not found.");
	}

	const assignment = (rental.assignments ?? []).find(
		(candidate) => candidate.id === input.assignmentId
	);
	if (!assignment) {
		throw new RentalOperationError(404, "Assignment not found.");
	}

	if (assignment.status !== "active") {
		throw new RentalOperationError(409, "Only active assignments can be removed.");
	}

	await updateAssignment({
		assignmentId: assignment.id,
		status: "cancelled",
		endDate: new Date().toISOString().slice(0, 10),
		notes:
			input.actor === "tenant"
				? assignment.notes ?? "Removed by tenant."
				: assignment.notes ?? "Removed by staff.",
	});

	await syncTrailerStatusAfterAssignmentChange(assignment.trailer_id);
	await syncTenantStatusFromRentals(rental.tenant_id);

	return mapRental((await getRentalById(rental.id)) ?? rental);
}

export async function removeAccountRentalAssignment(
	context: UserContext,
	rentalId: string,
	assignmentId: string
) {
	const membership = ensureCanManageRentals(context);
	return removeRentalAssignmentCore({
		rentalId,
		assignmentId,
		tenantId: membership.tenant_id,
		actor: "tenant",
	});
}

export async function removeAdminRentalAssignment(
	rentalId: string,
	assignmentId: string
) {
	return removeRentalAssignmentCore({
		rentalId,
		assignmentId,
		actor: "admin",
	});
}

export async function listAdminRentalRecords() {
	const rentals = await listAdminRentals();
	return rentals.map(mapRental);
}

export async function getAdminRentalDetail(rentalId: string) {
	const rental = await getRentalById(rentalId);
	if (!rental) {
		throw new RentalOperationError(404, "Rental not found.");
	}

	const [trailers, tenantRentals, timelineItems, communications] = await Promise.all([
		listTrailers(),
		listRentalsByTenantId(rental.tenant_id),
		listAllTimelineItemsByTenantId(rental.tenant_id),
		listCommunicationEventsByTenantId(rental.tenant_id),
	]);
	const availableTrailers = trailers.filter((trailer) => trailer.status === "available");
	const rentalViews = buildTenantRentalViews({
		tenant: rental.tenant,
		rentals: tenantRentals,
		timelineItems,
		communications,
	});
	const rentalView =
		rentalViews.find((view: any) => view.rental.id === rental.id) ?? null;

	return {
		rental: mapRental(rental),
		rentalView,
		availableTrailers: availableTrailers.map((trailer) => mapTrailer(trailer, false)),
	};
}

export async function createAdminRentalRecord(rawInput: unknown) {
	const input = adminRentalCreateSchema.parse(rawInput);
	const tenant = await getTenantById(input.tenantId);
	if (!tenant) {
		throw new RentalOperationError(404, "Tenant not found.");
	}

	const recordKind =
		["draft", "customer_review", "changes_pending"].includes(input.status)
			? "request"
			: "agreement";
	const primaryRequestedTrailerType = getPrimaryRequestedTrailerType(
		input.requestedTrailerTypes
	);

	const rental = await createRental({
		tenantId: input.tenantId,
		recordKind,
		requestKind: "admin_created",
		status: input.status,
		billingStatus: input.billingStatus,
		billingFrequency: input.billingFrequency,
		rate: input.rate,
		depositAmount: input.depositAmount,
		contractStartDate: input.contractStartDate,
		operationalStartDate: input.operationalStartDate,
		endDate: input.endDate,
		requestSummary: input.requestSummary || null,
		requestedTrailerCount: primaryRequestedTrailerType?.quantity ?? null,
		requestedTrailerType: primaryRequestedTrailerType?.trailerType ?? null,
	});

	await replaceRequestedTrailerTypesForRental(
		rental.id,
		input.requestedTrailerTypes
	);

	await attachTrailersToRental({
		rental,
		trailerIds: input.trailerIds,
		startDate: input.contractStartDate ?? input.operationalStartDate ?? null,
		endDate: input.endDate ?? null,
		notes: input.requestSummary || "Assigned during rental creation.",
	});

	const refreshedRental = await getRentalById(rental.id);
	if (!refreshedRental) {
		throw new RentalOperationError(500, "The rental was created but could not be reloaded.");
	}

	await syncTenantStatusFromRentals(input.tenantId);
	return mapRental(refreshedRental);
}

async function resolveRentalRequest(
	rental: RentalRecord,
	action:
		| "send_proposal"
		| "resend_proposal"
		| "approve_request"
		| "deny_request"
		| "cancel_request",
	input: ReturnType<typeof adminRentalUpdateSchema.parse>
) {
	if (rental.record_kind !== "request" || rental.resolved_at) {
		throw new RentalOperationError(409, "This rental request is no longer pending.");
	}

	const nextOutcome: RentalRequestOutcome =
		action === "deny_request" ? "denied" : "cancelled";
	const nextStatus: RentalStatus =
		action === "deny_request" ? "declined" : "cancelled";
	const nextBillingStatus: BillingStatus = "cancelled";

	if (rental.stripe_subscription_id) {
		await cancelRentalBillingSubscription(rental.id);
	}

	await releaseActiveAssignments(rental);

	const resolvedRental = await updateRental({
		rentalId: rental.id,
		requestOutcome: nextOutcome,
		resolvedAt: new Date().toISOString(),
		status: nextStatus,
		billingStatus: nextBillingStatus,
	});

	await syncTenantStatusFromRentals(resolvedRental.tenant_id);
	return mapRental(resolvedRental);
}

async function sendRentalProposal(
	rental: RentalRecord,
	input: ReturnType<typeof adminRentalUpdateSchema.parse>
) {
	if (isClosedRentalStatus(rental.status)) {
		throw new RentalOperationError(409, "Closed rentals cannot be sent for review.");
	}

	if (rental.record_kind === "request" && rental.resolved_at) {
		throw new RentalOperationError(409, "This rental request is no longer pending.");
	}

	const approvedTermsLocked = areApprovedTermsLocked(rental);
	const updatedRental = await updateRental({
		rentalId: rental.id,
		tenantId: await resolveAdminRentalTenantId(rental, input.tenantId),
		recordKind: rental.record_kind,
		requestOutcome: rental.record_kind === "request" ? null : rental.request_outcome,
		resolvedAt: rental.record_kind === "request" ? null : rental.resolved_at,
		status: "customer_review",
		billingStatus:
			rental.record_kind === "agreement" ? rental.billing_status : "draft",
		billingFrequency: approvedTermsLocked
			? rental.billing_frequency
			: input.billingFrequency ?? rental.billing_frequency,
		rate: "rate" in input ? input.rate : parseNumericValue(rental.rate),
		depositAmount:
			"depositAmount" in input
				? input.depositAmount
				: parseNumericValue(rental.deposit_amount),
		contractStartDate: approvedTermsLocked
			? rental.contract_start_date
			: input.contractStartDate ?? rental.contract_start_date,
		operationalStartDate:
			input.operationalStartDate ?? rental.operational_start_date,
		endDate: input.endDate ?? rental.end_date,
		requestSummary:
			typeof input.requestSummary === "string"
				? input.requestSummary
				: rental.request_summary,
	});

	await attachTrailersToRental({
		rental: updatedRental,
		trailerIds: input.trailerIds,
		startDate:
			input.contractStartDate ??
			updatedRental.contract_start_date ??
			updatedRental.operational_start_date ??
			null,
		endDate: input.endDate ?? updatedRental.end_date ?? null,
		notes:
			typeof input.requestSummary === "string"
				? input.requestSummary
				: updatedRental.request_summary,
	});

	await syncTenantStatusFromRentals(updatedRental.tenant_id);
	const refreshedRental = await getRentalById(rental.id);
	return mapRental(refreshedRental ?? updatedRental);
}

export async function updateAdminRentalRecord(rentalId: string, rawInput: unknown) {
	const input = adminRentalUpdateSchema.parse(rawInput);
	const rental = await getRentalById(rentalId);

	if (!rental) {
		throw new RentalOperationError(404, "Rental not found.");
	}

	if (
		input.action === "send_proposal" ||
		input.action === "resend_proposal" ||
		input.action === "approve_request"
	) {
		return sendRentalProposal(rental, input);
	}

	if (input.action !== "save") {
		return resolveRentalRequest(rental, input.action, input);
	}

	const nextTenantId = await resolveAdminRentalTenantId(rental, input.tenantId);
	const approvedTermsLocked = areApprovedTermsLocked(rental);
	const nextStatus = input.status ?? rental.status;
	const nextBillingStatus = input.billingStatus ?? rental.billing_status;

	if (
		rental.stripe_subscription_id &&
		(rental.status !== "cancelled" || rental.billing_status !== "cancelled") &&
		(nextStatus === "cancelled" || nextBillingStatus === "cancelled")
	) {
		await cancelRentalBillingSubscription(rental.id);
	}

	const updatedRental = await updateRental({
		rentalId: rental.id,
		tenantId: nextTenantId,
		status: nextStatus,
		billingStatus: nextBillingStatus,
		billingFrequency: approvedTermsLocked
			? rental.billing_frequency
			: input.billingFrequency ?? rental.billing_frequency,
		rate: "rate" in input ? input.rate : parseNumericValue(rental.rate),
		depositAmount:
			"depositAmount" in input
				? input.depositAmount
				: parseNumericValue(rental.deposit_amount),
		contractStartDate: approvedTermsLocked
			? rental.contract_start_date
			: input.contractStartDate ?? rental.contract_start_date,
		operationalStartDate:
			input.operationalStartDate ?? rental.operational_start_date,
		endDate: input.endDate ?? rental.end_date,
		requestSummary:
			typeof input.requestSummary === "string"
				? input.requestSummary
				: rental.request_summary,
	});

	await attachTrailersToRental({
		rental: updatedRental,
		trailerIds: input.trailerIds ?? [],
		startDate: input.contractStartDate ?? updatedRental.contract_start_date,
		endDate: input.endDate ?? updatedRental.end_date,
		notes:
			typeof input.requestSummary === "string"
				? input.requestSummary
				: updatedRental.request_summary,
	});

	const refreshedRental = await getRentalById(rental.id);
	if (!refreshedRental) {
		throw new RentalOperationError(500, "The rental was updated but could not be reloaded.");
	}

	await syncTenantStatusFromRentals(updatedRental.tenant_id);
	return mapRental(refreshedRental);
}

export async function deleteAdminRentalRecord(rentalId: string) {
	const rental = await getRentalById(rentalId);
	if (!rental) {
		throw new RentalOperationError(404, "Rental not found.");
	}

	if (
		rental.record_kind !== "request" ||
		rental.status !== "draft" ||
		Boolean(rental.resolved_at) ||
		(rental.assignments?.length ?? 0) > 0
	) {
		throw new RentalOperationError(
			409,
			"Only unresolved draft requests can be deleted."
		);
	}

	await deleteRental(rentalId);
	await syncTenantStatusFromRentals(rental.tenant_id);
}

export async function listAdminTrailerRecords() {
	const trailers = await listTrailers();
	return trailers.map((trailer) => mapTrailer(trailer));
}

export async function getAdminTrailerDetail(trailerId: string) {
	const trailer = await getTrailerById(trailerId);
	if (!trailer) {
		throw new RentalOperationError(404, "Trailer not found.");
	}

	return {
		trailer: mapTrailer(trailer),
	};
}

export async function createAdminTrailerRecord(rawInput: unknown) {
	const input = adminTrailerCreateSchema.parse(rawInput);
	let targetRental: RentalRecord | null = null;
	if (input.rentalId) {
		targetRental = await getRentalById(input.rentalId);
		if (!targetRental) {
			throw new RentalOperationError(404, "The selected rental could not be found.");
		}
	}

	const trailer = await createTrailer({
		trailerCode: input.trailerCode || null,
		trailerType: input.trailerType,
		plateNumber: input.plateNumber || null,
		vin: input.vin || null,
		status: input.status,
	});

	if (targetRental) {
		await attachTrailersToRental({
			rental: targetRental,
			trailerIds: [trailer.id],
			notes: "Assigned during trailer creation.",
		});
	}

	const refreshedTrailer = await getTrailerById(trailer.id);
	if (!refreshedTrailer) {
		throw new RentalOperationError(500, "The trailer was created but could not be reloaded.");
	}

	return mapTrailer(refreshedTrailer);
}

export async function updateAdminTrailerRecord(trailerId: string, rawInput: unknown) {
	const input = adminTrailerUpdateSchema.parse(rawInput);
	const existingTrailer = await getTrailerById(trailerId);
	if (!existingTrailer) {
		throw new RentalOperationError(404, "Trailer not found.");
	}

	const nextStatus = input.status ?? existingTrailer.status;
	const hasActiveAssignments = (existingTrailer.assignments ?? []).some(
		(assignment) => assignment.status === "active"
	);

	if (
		hasActiveAssignments &&
		(nextStatus === "available" || nextStatus === "retired" || nextStatus === "maintenance")
	) {
		throw new RentalOperationError(
			409,
			"Resolve active assignments before moving this trailer out of service."
		);
	}

	const trailer = await updateTrailer({
		trailerId,
		trailerCode: input.trailerCode ?? existingTrailer.trailer_code,
		trailerType: input.trailerType ?? existingTrailer.trailer_type,
		plateNumber: input.plateNumber ?? existingTrailer.plate_number,
		vin: input.vin ?? existingTrailer.vin,
		status: nextStatus,
	});

	return mapTrailer(trailer);
}
