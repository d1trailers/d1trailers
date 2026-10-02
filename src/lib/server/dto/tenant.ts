import {
	canManageRentals,
	hasTenantPermission,
	type TenantMembershipContext,
} from "@/lib/server/services/access";

/**
 * Tenant-facing data transfer objects.
 *
 * Everything returned to a tenant user (API responses and props passed to client
 * components) must go through these helpers. They use explicit allowlists so new
 * database columns never leak to the browser by default. Never include application
 * payloads (SSN/EIN), staff review notes, staff-only timeline items, Stripe customer
 * or subscription identifiers, raw provider payloads, or identity documents for
 * non-owners.
 */

type AnyRecord = Record<string, any>;

const GENERIC_PROCESSING_ERROR =
	"We couldn't complete this step. Our team has been notified and will follow up.";

export type TenantVisibility = {
	isOwner: boolean;
	canViewRentals: boolean;
	canViewDocuments: boolean;
	canViewBilling: boolean;
	canViewTimeline: boolean;
	canManageRentals: boolean;
};

export function getTenantVisibility(
	membership: TenantMembershipContext | null
): TenantVisibility {
	return {
		isOwner: membership?.role === "account_owner",
		canViewRentals: hasTenantPermission(membership, "view_rentals"),
		canViewDocuments: hasTenantPermission(membership, "view_documents"),
		canViewBilling: hasTenantPermission(membership, "view_billing"),
		canViewTimeline: hasTenantPermission(membership, "view_timeline"),
		canManageRentals: canManageRentals(membership),
	};
}

function pick(source: AnyRecord | null | undefined, keys: readonly string[]) {
	const result: AnyRecord = {};
	if (!source) return result;
	for (const key of keys) {
		if (key in source) result[key] = source[key];
	}
	return result;
}

function asArray(value: unknown): AnyRecord[] {
	return Array.isArray(value) ? (value as AnyRecord[]) : [];
}

function genericError(message: unknown) {
	return message ? GENERIC_PROCESSING_ERROR : null;
}

// ---------------------------------------------------------------------------
// Raw (snake_case) records — used for the portal workspace, which is rendered by
// client components through src/lib/viewmodels/tenantWorkspace.js.
// ---------------------------------------------------------------------------

const RAW_RENTAL_FIELDS = [
	"id",
	"tenant_id",
	"application_id",
	"status",
	"billing_status",
	"billing_frequency",
	"rate",
	"deposit_amount",
	"contract_start_date",
	"operational_start_date",
	"end_date",
	"record_kind",
	"request_kind",
	"parent_rental_id",
	"requested_trailer_count",
	"requested_trailer_type",
	"request_summary",
	"resolved_at",
	"request_outcome",
	"created_at",
	"updated_at",
	"current_period_end",
	"last_invoice_id",
] as const;

const RAW_TRAILER_FIELDS = [
	"id",
	"trailer_code",
	"trailer_type",
	"plate_number",
	"vin",
	"status",
] as const;

const RAW_DOCUMENT_FIELDS = [
	"id",
	"rental_id",
	"application_id",
	"file_name",
	"document_type",
	"category",
	"content_type",
	"signed_url",
	"created_at",
] as const;

const RAW_INVOICE_FIELDS = [
	"id",
	"tenant_id",
	"rental_id",
	"stripe_invoice_id",
	"status",
	"billing_reason",
	"currency",
	"amount_due",
	"amount_paid",
	"amount_remaining",
	"hosted_invoice_url",
	"invoice_pdf_url",
	"period_start",
	"period_end",
	"due_at",
	"paid_at",
	"created_at",
] as const;

const RAW_INVOICE_LINE_FIELDS = [
	"id",
	"invoice_id",
	"rental_id",
	"source_type",
	"description",
	"amount",
	"quantity",
	"currency",
	"period_start",
	"period_end",
	"created_at",
] as const;

const RAW_TIMELINE_FIELDS = [
	"id",
	"tenant_id",
	"rental_id",
	"application_id",
	"type",
	"item_key",
	"stage",
	"title",
	"description",
	"due_at",
	"completed_at",
	"cta_label",
	"cta_url",
	"sort_order",
	"created_at",
] as const;

export function toTenantTimelineItemRecord(item: AnyRecord) {
	return {
		...pick(item, RAW_TIMELINE_FIELDS),
		metadata: item.metadata?.rentalId ? { rentalId: item.metadata.rentalId } : {},
	};
}

export function filterTenantVisibleTimelineItems(items: unknown) {
	return asArray(items)
		.filter((item) => item.visible_to_tenant === true)
		.map(toTenantTimelineItemRecord);
}

function toTenantSigningPacketRecord(packet: AnyRecord, visibility: TenantVisibility) {
	const canSeeCheckout = visibility.canManageRentals || visibility.canViewBilling;
	return {
		id: packet.id,
		rental_id: packet.rental_id,
		status: packet.status,
		signer_profile_id: packet.signer_profile_id ?? null,
		signer_name: packet.signer_name ?? null,
		signer_email: packet.signer_email ?? null,
		document_count: packet.document_count ?? 0,
		billing_activation_status: packet.billing_activation_status ?? null,
		billing_checkout_url: canSeeCheckout ? packet.billing_checkout_url ?? null : null,
		billing_error_message: genericError(packet.billing_error_message),
		error_message: genericError(packet.error_message),
		completed_at: packet.completed_at ?? null,
		declined_at: packet.declined_at ?? null,
		voided_at: packet.voided_at ?? null,
		last_synced_at: packet.last_synced_at ?? null,
		documents: asArray(packet.documents).map((document) => ({
			id: document.id,
			document_name: document.document_name,
			status: document.status,
			rental_document_id: document.rental_document_id ?? null,
			sort_order: document.sort_order ?? 100,
		})),
	};
}

export function toTenantRentalRecord(rental: AnyRecord, visibility: TenantVisibility) {
	const application = rental.application
		? {
				id: rental.application.id,
				status: rental.application.status,
				company_name: rental.application.company_name ?? null,
				// Application uploads are identity documents (e.g. driver's license);
				// only the account owner who submitted them may see them.
				documents:
					visibility.isOwner && visibility.canViewDocuments
						? asArray(rental.application.documents).map((document) =>
								pick(document, RAW_DOCUMENT_FIELDS)
						  )
						: [],
				timeline_items: visibility.canViewTimeline
					? filterTenantVisibleTimelineItems(rental.application.timeline_items)
					: [],
		  }
		: null;

	return {
		...pick(rental, RAW_RENTAL_FIELDS),
		tenant: rental.tenant
			? { id: rental.tenant.id, display_name: rental.tenant.display_name ?? null }
			: null,
		application,
		requested_trailer_types: asArray(rental.requested_trailer_types).map((row) => ({
			trailer_type: row.trailer_type,
			quantity: row.quantity,
		})),
		assignments: asArray(rental.assignments).map((assignment) => ({
			id: assignment.id,
			rental_id: assignment.rental_id,
			trailer_id: assignment.trailer_id,
			status: assignment.status,
			start_date: assignment.start_date,
			end_date: assignment.end_date,
			notes: null,
			trailer: assignment.trailer ? pick(assignment.trailer, RAW_TRAILER_FIELDS) : null,
		})),
		documents: visibility.canViewDocuments
			? asArray(rental.documents).map((document) => pick(document, RAW_DOCUMENT_FIELDS))
			: [],
		billing_invoices: visibility.canViewBilling
			? asArray(rental.billing_invoices).map((invoice) => ({
					...pick(invoice, RAW_INVOICE_FIELDS),
					lines: asArray(invoice.lines).map((line) => pick(line, RAW_INVOICE_LINE_FIELDS)),
			  }))
			: [],
		signing_packets: asArray(rental.signing_packets).map((packet) =>
			toTenantSigningPacketRecord(packet, visibility)
		),
	};
}

export function toTenantCommunicationRecord(communication: AnyRecord) {
	const rentalId = communication.rental_id ?? communication.payload_snapshot?.rentalId ?? null;
	return {
		id: communication.id,
		type: communication.type,
		status: communication.status,
		subject: communication.subject,
		recipient_email: communication.recipient_email,
		created_at: communication.created_at,
		sent_at: communication.sent_at ?? null,
		application_id: communication.application_id ?? null,
		rental_id: rentalId,
		payload_snapshot: rentalId ? { rentalId } : {},
	};
}

export function toTenantCommunicationRecords(communications: unknown) {
	return asArray(communications)
		.filter((communication) => !communication.payload_snapshot?.invitationId)
		.map(toTenantCommunicationRecord);
}

export function toTenantTenantRecord(tenant: AnyRecord | null | undefined) {
	if (!tenant) return null;
	return {
		id: tenant.id,
		display_name: tenant.display_name ?? null,
		legal_name: tenant.legal_name ?? null,
		status: tenant.status ?? null,
	};
}

export function toTenantApplicationRecord(
	application: AnyRecord,
	visibility: TenantVisibility
) {
	return {
		id: application.id,
		status: application.status,
		company_name: application.company_name ?? null,
		submitted_at: application.submitted_at ?? null,
		reviewed_at: application.reviewed_at ?? null,
		documents:
			visibility.isOwner && visibility.canViewDocuments
				? asArray(application.documents).map((document) =>
						pick(document, RAW_DOCUMENT_FIELDS)
				  )
				: [],
	};
}

// ---------------------------------------------------------------------------
// Mapped (camelCase) rentals — returned by /api/account/* routes from
// src/lib/server/services/rentals.ts mapRental().
// ---------------------------------------------------------------------------

export function toTenantMappedRental(rental: AnyRecord, visibility: TenantVisibility) {
	const {
		stripe: _stripe,
		application: rawApplication,
		documents,
		billingInvoices,
		signingPackets,
		assignments,
		trailers,
		requestedByProfileId: _requestedByProfileId,
		...rest
	} = rental;

	const canSeeCheckout = visibility.canManageRentals || visibility.canViewBilling;

	return {
		...rest,
		application: rawApplication
			? {
					id: rawApplication.id,
					status: rawApplication.status,
					companyName: rawApplication.companyName ?? null,
					submittedAt: rawApplication.submittedAt ?? null,
					documents:
						visibility.isOwner && visibility.canViewDocuments
							? asArray(rawApplication.documents)
							: [],
					timelineItems: visibility.canViewTimeline
						? asArray(rawApplication.timelineItems)
								.filter((item) => item.visibleToTenant === true)
								.map(({ metadata, ...item }) => ({
									...item,
									metadata: metadata?.rentalId ? { rentalId: metadata.rentalId } : {},
								}))
						: [],
			  }
			: null,
		documents: visibility.canViewDocuments ? asArray(documents) : [],
		billingInvoices: visibility.canViewBilling
			? asArray(billingInvoices).map(
					({ stripeCustomerId: _c, stripeSubscriptionId: _s, lines, ...invoice }) => ({
						...invoice,
						lines: asArray(lines).map(({ metadata: _m, stripeLineItemId: _l, ...line }) => line),
					})
			  )
			: [],
		signingPackets: asArray(signingPackets).map(
			({ envelopeId: _e, billingCheckoutSessionId: _b, ...packet }) => ({
				...packet,
				billingCheckoutUrl: canSeeCheckout ? packet.billingCheckoutUrl ?? null : null,
				billingErrorMessage: genericError(packet.billingErrorMessage),
				errorMessage: genericError(packet.errorMessage),
			})
		),
		assignments: asArray(assignments).map(({ notes: _n, ...assignment }) => assignment),
		trailers: asArray(trailers),
	};
}
