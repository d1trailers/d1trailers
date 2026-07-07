import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";
import type {
	ApplicationSubmissionInput,
} from "@/lib/contracts/application";
import type {
	TenantPermission,
	TenantRole,
} from "@/lib/contracts/account";
import type { InterestSubmissionInput } from "@/lib/contracts/interest";
import type {
	BillingFrequency,
	BillingStatus,
	RentalRecordKind,
	RentalRequestKind,
	RentalRequestOutcome,
	RentalStatus,
	TrailerStatus,
} from "@/lib/contracts/rentals";

export type TenantRecord = {
	id: string;
	display_name: string;
	legal_name: string | null;
	slug: string;
	primary_email: string;
	primary_phone: string | null;
	status: string;
	created_at: string;
	updated_at: string;
};

export type StaffMembershipRecord = {
	id: string;
	profile_id: string;
	role: "staff_admin" | "staff_ops";
	is_active: boolean;
};

export type TenantMembershipRecord = {
	id: string;
	tenant_id: string;
	profile_id: string;
	role: TenantRole;
	invitation_status: string;
	is_active: boolean;
	tenant?: TenantRecord;
	permissions?: TenantMembershipPermissionRecord[];
};

export type ProfileRecord = {
	id: string;
	email: string;
	display_name: string | null;
	phone: string | null;
	last_active_tenant_id: string | null;
};

export type TenantMembershipPermissionRecord = {
	id: string;
	membership_id: string;
	permission: TenantPermission;
};

export type TenantInvitationRecord = {
	id: string;
	tenant_id: string;
	invited_email: string;
	invited_by_profile_id: string | null;
	accepted_by_profile_id: string | null;
	target_role: TenantRole;
	permission_snapshot: TenantPermission[];
	status: "pending" | "accepted" | "revoked" | "expired";
	expires_at: string | null;
	accepted_at: string | null;
	revoked_at: string | null;
	created_at: string;
	updated_at: string;
	tenant?: TenantRecord;
	invited_by_profile?: ProfileRecord | null;
};

export type CommunicationEventRecord = {
	id: string;
	tenant_id: string | null;
	application_id: string | null;
	rental_id: string | null;
	recipient_email: string;
	type: string;
	status: string;
	subject: string | null;
	provider: string | null;
	provider_message_id: string | null;
	error_message: string | null;
	payload_snapshot?: Record<string, unknown>;
	sent_at?: string | null;
	created_at?: string;
};

export type ApplicationRecord = {
	id: string;
	tenant_id: string;
	status: string;
	company_name: string;
	primary_email: string;
	primary_phone: string;
	owner_first_name: string;
	owner_last_name: string;
	billing_frequency: "weekly" | "monthly" | "yearly";
	rental_duration: string;
	intended_use: string | null;
	payload: Record<string, unknown>;
	review_notes: string | null;
	submitted_at: string;
	reviewed_at: string | null;
	tenant?: TenantRecord;
	documents?: ApplicationDocumentRecord[];
	timeline_items?: TimelineItemRecord[];
};

export type TimelineItemRecord = {
	id: string;
	tenant_id: string;
	rental_id?: string | null;
	type: string;
	item_key: string | null;
	stage: "current" | "upcoming" | "completed";
	sort_order: number;
	title: string;
	description: string | null;
	visible_to_tenant: boolean;
	due_at: string | null;
	completed_at: string | null;
	cta_label: string | null;
	cta_url: string | null;
	application_id?: string | null;
	created_by_profile_id?: string | null;
	updated_by_profile_id?: string | null;
	metadata: Record<string, unknown>;
	created_at: string;
};

export type ApplicationDocumentRecord = {
	id: string;
	application_id: string;
	bucket: string;
	storage_path: string;
	file_name: string;
	content_type: string | null;
	category: string | null;
	document_type: string;
	created_at: string;
	signed_url?: string | null;
};

export type RentalDocumentRecord = {
	id: string;
	rental_id: string;
	bucket: string;
	storage_path: string;
	file_name: string;
	content_type: string | null;
	category: string | null;
	document_type: string;
	created_by_profile_id: string | null;
	created_at: string;
	signed_url?: string | null;
};

export type DocuSignTemplateRecord = {
	id: string;
	template_key: string;
	display_name: string;
	docusign_template_id: string;
	role_name: string;
	required: boolean;
	active: boolean;
	sort_order: number;
	tab_config: Record<string, unknown>;
	metadata: Record<string, unknown>;
	created_at: string;
	updated_at: string;
};

export type RentalSigningPacketStatus =
	| "draft"
	| "sent"
	| "in_progress"
	| "completed"
	| "declined"
	| "voided"
	| "failed";

export type RentalSigningPacketRecord = {
	id: string;
	tenant_id: string;
	rental_id: string;
	docusign_envelope_id: string | null;
	status: RentalSigningPacketStatus;
	signer_profile_id: string | null;
	signer_name: string | null;
	signer_email: string;
	document_count: number;
	billing_activation_status: "pending" | "ready" | "completed" | "failed" | "skipped";
	billing_checkout_url: string | null;
	billing_checkout_session_id: string | null;
	billing_error_message: string | null;
	completed_at: string | null;
	declined_at: string | null;
	voided_at: string | null;
	last_synced_at: string | null;
	error_message: string | null;
	metadata: Record<string, unknown>;
	created_at: string;
	updated_at: string;
	documents?: RentalSigningPacketDocumentRecord[];
};

export type RentalSigningPacketDocumentRecord = {
	id: string;
	packet_id: string;
	rental_id: string;
	template_id: string | null;
	docusign_document_id: string | null;
	document_name: string;
	status: "pending" | "signed" | "stored" | "failed";
	bucket: string | null;
	storage_path: string | null;
	rental_document_id: string | null;
	sort_order: number;
	metadata: Record<string, unknown>;
	created_at: string;
	updated_at: string;
};

export type DocuSignEventRecord = {
	id: string;
	event_hash: string;
	event_type: string;
	docusign_envelope_id: string | null;
	packet_id: string | null;
	processing_status: "pending" | "processed" | "failed" | "skipped";
	error_message: string | null;
	raw_payload: Record<string, unknown>;
	processed_at: string | null;
	created_at: string;
	updated_at: string;
};

export type BillingInvoiceLineSource =
	| "rental_charge"
	| "deposit"
	| "toll"
	| "fee"
	| "adjustment";

export type BillingAccountRecord = {
	id: string;
	tenant_id: string;
	stripe_customer_id: string | null;
	default_currency: string;
	created_at: string;
	updated_at: string;
};

export type BillingInvoiceLineRecord = {
	id: string;
	invoice_id: string;
	tenant_id: string;
	rental_id: string | null;
	stripe_line_item_id: string | null;
	source_type: BillingInvoiceLineSource;
	description: string | null;
	amount: number;
	quantity: number | null;
	currency: string;
	period_start: string | null;
	period_end: string | null;
	metadata: Record<string, unknown>;
	created_at: string;
	updated_at: string;
};

export type BillingInvoiceRecord = {
	id: string;
	tenant_id: string;
	rental_id: string | null;
	stripe_invoice_id: string;
	stripe_customer_id: string | null;
	stripe_subscription_id: string | null;
	status: string;
	billing_reason: string | null;
	collection_method: string | null;
	currency: string;
	amount_due: number;
	amount_paid: number;
	amount_remaining: number;
	hosted_invoice_url: string | null;
	invoice_pdf_url: string | null;
	period_start: string | null;
	period_end: string | null;
	due_at: string | null;
	paid_at: string | null;
	raw_payload: Record<string, unknown>;
	created_at: string;
	updated_at: string;
	lines?: BillingInvoiceLineRecord[];
};

export type StripeEventRecord = {
	id: string;
	stripe_event_id: string;
	event_type: string;
	processing_status: "pending" | "processed" | "failed" | "skipped";
	tenant_id: string | null;
	rental_id: string | null;
	billing_invoice_id: string | null;
	error_message: string | null;
	raw_payload: Record<string, unknown>;
	processed_at: string | null;
	created_at: string;
	updated_at: string;
};

export type TrailerRecord = {
	id: string;
	trailer_code: string | null;
	trailer_type: string | null;
	plate_number: string | null;
	vin: string | null;
	status: TrailerStatus;
	created_at: string;
	updated_at: string;
	assignments?: AssignmentRecord[];
};

export type AssignmentRecord = {
	id: string;
	rental_id: string;
	trailer_id: string;
	status: "active" | "expired" | "cancelled";
	start_date: string | null;
	end_date: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
	trailer?: TrailerRecord | null;
	rental?: RentalRecord | null;
};

export type RentalRequestedTrailerTypeRecord = {
	id: string;
	rental_id: string;
	trailer_type: string;
	quantity: number;
	sort_order: number;
	created_at: string;
	updated_at: string;
};

export type RentalRecord = {
	id: string;
	tenant_id: string;
	application_id: string | null;
	status: RentalStatus;
	billing_status: BillingStatus;
	billing_frequency: BillingFrequency;
	rate: number | null;
	deposit_amount: number | null;
	contract_start_date: string | null;
	operational_start_date: string | null;
	end_date: string | null;
	stripe_customer_id: string | null;
	stripe_subscription_id: string | null;
	stripe_price_id: string | null;
	stripe_product_id: string | null;
	current_period_end: string | null;
	last_invoice_id: string | null;
	record_kind: RentalRecordKind;
	request_kind: RentalRequestKind;
	parent_rental_id: string | null;
	requested_trailer_count: number | null;
	requested_trailer_type: string | null;
	request_summary: string | null;
	requested_by_profile_id: string | null;
	resolved_at: string | null;
	request_outcome: RentalRequestOutcome | null;
	created_at: string;
	updated_at: string;
	assignments?: AssignmentRecord[];
	requested_trailer_types?: RentalRequestedTrailerTypeRecord[];
	tenant?: TenantRecord | null;
	application?: ApplicationRecord | null;
	parent_rental?: RentalRecord | null;
	documents?: RentalDocumentRecord[];
	billing_invoices?: BillingInvoiceRecord[];
	signing_packets?: RentalSigningPacketRecord[];
};

function admin() {
	return createAdminClient();
}

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

function assertData<T>(data: T | null, error: { message: string } | null | undefined) {
	if (error) throw new Error(error.message);
	if (data === null) throw new Error("Expected data but received null.");
	return data;
}

function slugify(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 50);
}

export async function getProfileById(profileId: string) {
	const { data, error } = await admin()
		.from("profiles")
		.select("*")
		.eq("id", profileId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data as ProfileRecord | null) ?? null;
}

export async function getProfileByEmail(email: string) {
	const { data, error } = await admin()
		.from("profiles")
		.select("*")
		.ilike("email", normalizeEmail(email))
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data as ProfileRecord | null) ?? null;
}

export async function ensureProfile(input: {
	id: string;
	email: string;
	displayName?: string | null;
	phone?: string | null;
}) {
	const normalizedEmail = normalizeEmail(input.email);
	const existingByEmail = await getProfileByEmail(normalizedEmail);

	if (existingByEmail && existingByEmail.id !== input.id) {
		if (input.displayName || input.phone) {
			const { data, error } = await admin()
				.from("profiles")
				.update({
					display_name: input.displayName ?? existingByEmail.display_name,
					phone: input.phone ?? existingByEmail.phone,
				})
				.eq("id", existingByEmail.id)
				.select("*")
				.single();
			return assertData(data as ProfileRecord | null, error);
		}

		return existingByEmail;
	}

	const { data, error } = await admin()
		.from("profiles")
		.upsert(
			{
				id: input.id,
				email: normalizedEmail,
				display_name: input.displayName ?? null,
				phone: input.phone ?? null,
			},
			{ onConflict: "id" }
	)
	.select("*")
	.single();
	return assertData(data as ProfileRecord | null, error);
}

export async function updateProfileLastActiveTenant(input: {
	profileId: string;
	tenantId: string | null;
}) {
	const { data, error } = await admin()
		.from("profiles")
		.update({
			last_active_tenant_id: input.tenantId,
		})
		.eq("id", input.profileId)
		.select("*")
		.single();
	return assertData(data as ProfileRecord | null, error);
}

export async function getStaffMembershipByProfileId(profileId: string) {
	const { data, error } = await admin()
		.from("staff_memberships")
		.select("*")
		.eq("profile_id", profileId)
		.eq("is_active", true)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data as StaffMembershipRecord | null) ?? null;
}

export async function getTenantMembershipsByProfileId(profileId: string) {
	const { data, error } = await admin()
		.from("tenant_memberships")
		.select("*, tenant:tenants(*), permissions:tenant_membership_permissions(*)")
		.eq("profile_id", profileId)
		.eq("is_active", true)
		.order("created_at", { ascending: true });
	if (error) throw new Error(error.message);
	return (data as TenantMembershipRecord[]) ?? [];
}

export async function getTenantMembershipById(membershipId: string) {
	const { data, error } = await admin()
		.from("tenant_memberships")
		.select("*, tenant:tenants(*), permissions:tenant_membership_permissions(*)")
		.eq("id", membershipId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data as TenantMembershipRecord | null) ?? null;
}

export async function getTenantMembershipByTenantAndProfile(input: {
	tenantId: string;
	profileId: string;
}) {
	const { data, error } = await admin()
		.from("tenant_memberships")
		.select("*, tenant:tenants(*), permissions:tenant_membership_permissions(*)")
		.eq("tenant_id", input.tenantId)
		.eq("profile_id", input.profileId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data as TenantMembershipRecord | null) ?? null;
}

export async function getTenantByPrimaryEmail(email: string) {
	const { data, error } = await admin()
		.from("tenants")
		.select("*")
		.ilike("primary_email", normalizeEmail(email))
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data as TenantRecord | null) ?? null;
}

export async function getTenantById(tenantId: string) {
	const { data, error } = await admin()
		.from("tenants")
		.select("*")
		.eq("id", tenantId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data as TenantRecord | null) ?? null;
}

export async function listTenants() {
	const { data, error } = await admin()
		.from("tenants")
		.select("*")
		.order("updated_at", { ascending: false });
	if (error) throw new Error(error.message);
	return (data as TenantRecord[]) ?? [];
}

export async function createLeadTenant(input: InterestSubmissionInput) {
	const baseSlug = slugify(input.companyName || `${input.firstName}-${input.lastName}`);
	let candidateSlug = baseSlug || `lead-${Date.now()}`;
	let attempt = 1;

	while (true) {
		const { data, error } = await admin()
			.from("tenants")
			.insert({
				display_name: input.companyName,
				legal_name: input.companyName,
				slug: candidateSlug,
				primary_email: normalizeEmail(input.email),
				primary_phone: input.phone,
				status: "lead",
			})
			.select("*")
			.single();

		if (!error) {
			return data as TenantRecord;
		}

		if (!error.message.toLowerCase().includes("duplicate")) {
			throw new Error(error.message);
		}

		attempt += 1;
		candidateSlug = `${baseSlug}-${attempt}`;
	}
}

export async function createTenant(input: {
	displayName: string;
	legalName?: string | null;
	primaryEmail: string;
	primaryPhone?: string | null;
	status: "active" | "suspended" | "stale";
}) {
	const baseSlug = slugify(input.displayName || input.primaryEmail);
	let candidateSlug = baseSlug || `tenant-${Date.now()}`;
	let attempt = 1;

	while (true) {
		const { data, error } = await admin()
			.from("tenants")
			.insert({
				display_name: input.displayName,
				legal_name: input.legalName ?? input.displayName,
				slug: candidateSlug,
				primary_email: normalizeEmail(input.primaryEmail),
				primary_phone: input.primaryPhone ?? null,
				status: input.status,
			})
			.select("*")
			.single();

		if (!error) {
			return data as TenantRecord;
		}

		if (!error.message.toLowerCase().includes("duplicate")) {
			throw new Error(error.message);
		}

		attempt += 1;
		candidateSlug = `${baseSlug}-${attempt}`;
	}
}

export async function createInterestSubmission(
	tenantId: string | null,
	input: InterestSubmissionInput
) {
	const { data, error } = await admin()
		.from("interest_submissions")
		.insert({
			tenant_id: tenantId,
			first_name: input.firstName,
			last_name: input.lastName,
			email: normalizeEmail(input.email),
			phone: input.phone,
			company_name: input.companyName,
			rental_duration: input.duration,
			intended_use: input.typeOfUse,
			referral_source: input.referral || null,
		})
		.select("*")
		.single();
	return assertData(data, error);
}

export async function createCommunicationEvent(input: {
	tenantId?: string | null;
	applicationId?: string | null;
	rentalId?: string | null;
	recipientEmail: string;
	type: string;
	subject?: string | null;
	status?: string;
	payloadSnapshot?: Record<string, unknown>;
	provider?: string | null;
}) {
	const { data, error } = await admin()
		.from("communication_events")
		.insert({
			tenant_id: input.tenantId ?? null,
			application_id: input.applicationId ?? null,
			rental_id: input.rentalId ?? null,
			recipient_email: normalizeEmail(input.recipientEmail),
			type: input.type,
			subject: input.subject ?? null,
			status: input.status ?? "pending",
			payload_snapshot: input.payloadSnapshot ?? {},
			provider: input.provider ?? null,
		})
		.select("*")
		.single();
	return assertData(data as CommunicationEventRecord | null, error);
}

export async function updateCommunicationEvent(
	eventId: string,
	input: Partial<{
		status: string;
		provider: string | null;
		providerMessageId: string | null;
		errorMessage: string | null;
		sentAt: string | null;
		payloadSnapshot: Record<string, unknown>;
	}>
) {
	const { data, error } = await admin()
		.from("communication_events")
		.update({
			status: input.status,
			provider: input.provider,
			provider_message_id: input.providerMessageId,
			error_message: input.errorMessage,
			sent_at: input.sentAt,
			payload_snapshot: input.payloadSnapshot,
		})
		.eq("id", eventId)
		.select("*")
		.single();
	return assertData(data as CommunicationEventRecord | null, error);
}

export async function createApplication(input: {
	tenantId: string;
	payload: ApplicationSubmissionInput;
}) {
	const values = input.payload;
	const { data, error } = await admin()
		.from("applications")
		.insert({
			tenant_id: input.tenantId,
			status: "submitted",
			company_name: values.companyName,
			primary_email: normalizeEmail(values.email),
			primary_phone: values.phone,
			owner_first_name: values.ownerFirstName,
			owner_last_name: values.ownerLastName,
			billing_frequency: "monthly",
			rental_duration: values.rentalDuration,
			intended_use: null,
			payload: values,
		})
		.select("*")
		.single();
	return assertData(data as ApplicationRecord | null, error);
}

export async function updateTenantStatus(tenantId: string, status: string) {
	const { data, error } = await admin()
		.from("tenants")
		.update({ status })
		.eq("id", tenantId)
		.select("*")
		.single();
	return assertData(data as TenantRecord | null, error);
}

export async function createApplicationDocument(input: {
	applicationId: string;
	bucket: string;
	storagePath: string;
	fileName: string;
	contentType?: string | null;
	category?: string | null;
	documentType: string;
}) {
	const { data, error } = await admin()
		.from("application_documents")
		.insert({
			application_id: input.applicationId,
			bucket: input.bucket,
			storage_path: input.storagePath,
			file_name: input.fileName,
			content_type: input.contentType ?? null,
			category: input.category ?? null,
			document_type: input.documentType,
		})
		.select("*")
	.single();
	return assertData(data as ApplicationDocumentRecord | null, error);
}

export async function createRentalDocument(input: {
	rentalId: string;
	bucket: string;
	storagePath: string;
	fileName: string;
	contentType?: string | null;
	category?: string | null;
	documentType: string;
	createdByProfileId?: string | null;
}) {
	const { data, error } = await admin()
		.from("rental_documents")
		.insert({
			rental_id: input.rentalId,
			bucket: input.bucket,
			storage_path: input.storagePath,
			file_name: input.fileName,
			content_type: input.contentType ?? null,
			category: input.category ?? null,
			document_type: input.documentType,
			created_by_profile_id: input.createdByProfileId ?? null,
		})
		.select("*")
		.single();
	return assertData(data as RentalDocumentRecord | null, error);
}

export async function uploadApplicationFile(input: {
	applicationId: string;
	documentField: string;
	file: File;
}) {
	const buffer = Buffer.from(await input.file.arrayBuffer());
	const documentId = randomUUID();
	const storagePath = `applications/${input.applicationId}/${documentId}-${input.file.name}`;
	const { error } = await admin()
		.storage
		.from("application-documents")
		.upload(storagePath, buffer, {
			contentType: input.file.type || "application/octet-stream",
			upsert: false,
		});

	if (error) throw new Error(error.message);
	return storagePath;
}

export async function uploadRentalFile(input: {
	rentalId: string;
	file: File;
}) {
	const buffer = Buffer.from(await input.file.arrayBuffer());
	const documentId = randomUUID();
	const storagePath = `rentals/${input.rentalId}/${documentId}-${input.file.name}`;
	const { error } = await admin()
		.storage
		.from("application-documents")
		.upload(storagePath, buffer, {
			contentType: input.file.type || "application/octet-stream",
			upsert: false,
		});

	if (error) throw new Error(error.message);
	return storagePath;
}

export async function uploadRentalBuffer(input: {
	rentalId: string;
	fileName: string;
	contentType: string;
	buffer: Buffer;
}) {
	const documentId = randomUUID();
	const safeName = input.fileName || "document.pdf";
	const storagePath = `rentals/${input.rentalId}/${documentId}-${safeName}`;
	const { error } = await admin()
		.storage
		.from("application-documents")
		.upload(storagePath, input.buffer, {
			contentType: input.contentType || "application/octet-stream",
			upsert: false,
		});

	if (error) throw new Error(error.message);
	return storagePath;
}

type StorageDocumentRecord =
	| ApplicationDocumentRecord
	| RentalDocumentRecord;

async function addSignedUrlsToDocuments<T extends { documents?: StorageDocumentRecord[] }>(
	rows: T[]
) {
	return Promise.all(
		rows.map(async (row) => {
			const documents = Array.isArray(row.documents) ? row.documents : [];
			const documentsWithUrls = await Promise.all(
				documents.map(async (document) => {
					const { data, error } = await admin()
						.storage
						.from(document.bucket)
						.createSignedUrl(document.storage_path, 60 * 60);

					return {
						...document,
						signed_url: error ? null : data?.signedUrl ?? null,
					};
				})
			);

			return {
				...row,
				documents: documentsWithUrls,
			};
		})
	);
}

export async function listActiveDocuSignTemplates() {
	const { data, error } = await admin()
		.from("docusign_templates")
		.select("*")
		.eq("active", true)
		.eq("required", true)
		.order("sort_order", { ascending: true })
		.order("created_at", { ascending: true });
	if (error) throw new Error(error.message);
	return (data as DocuSignTemplateRecord[]) ?? [];
}

export async function getRentalSigningPacketById(packetId: string) {
	const { data, error } = await admin()
		.from("rental_signing_packets")
		.select("*, documents:rental_signing_packet_documents(*)")
		.eq("id", packetId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data as RentalSigningPacketRecord | null) ?? null;
}

export async function getRentalSigningPacketByEnvelopeId(envelopeId: string) {
	const { data, error } = await admin()
		.from("rental_signing_packets")
		.select("*, documents:rental_signing_packet_documents(*)")
		.eq("docusign_envelope_id", envelopeId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data as RentalSigningPacketRecord | null) ?? null;
}

export async function getActiveRentalSigningPacketByRentalId(rentalId: string) {
	const { data, error } = await admin()
		.from("rental_signing_packets")
		.select("*, documents:rental_signing_packet_documents(*)")
		.eq("rental_id", rentalId)
		.in("status", ["draft", "sent", "in_progress"])
		.order("created_at", { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data as RentalSigningPacketRecord | null) ?? null;
}

export async function createRentalSigningPacket(input: {
	tenantId: string;
	rentalId: string;
	envelopeId?: string | null;
	status?: RentalSigningPacketStatus;
	signerProfileId?: string | null;
	signerName?: string | null;
	signerEmail: string;
	documentCount?: number;
	metadata?: Record<string, unknown>;
}) {
	const { data, error } = await admin()
		.from("rental_signing_packets")
		.insert({
			tenant_id: input.tenantId,
			rental_id: input.rentalId,
			docusign_envelope_id: input.envelopeId ?? null,
			status: input.status ?? "draft",
			signer_profile_id: input.signerProfileId ?? null,
			signer_name: input.signerName ?? null,
			signer_email: normalizeEmail(input.signerEmail),
			document_count: input.documentCount ?? 0,
			metadata: input.metadata ?? {},
		})
		.select("*")
		.single();
	return assertData(data as RentalSigningPacketRecord | null, error);
}

export async function updateRentalSigningPacket(input: {
	packetId: string;
	envelopeId?: string | null;
	status?: RentalSigningPacketStatus;
	documentCount?: number;
	billingActivationStatus?: RentalSigningPacketRecord["billing_activation_status"];
	billingCheckoutUrl?: string | null;
	billingCheckoutSessionId?: string | null;
	billingErrorMessage?: string | null;
	completedAt?: string | null;
	declinedAt?: string | null;
	voidedAt?: string | null;
	lastSyncedAt?: string | null;
	errorMessage?: string | null;
	metadata?: Record<string, unknown>;
}) {
	const updates: Record<string, unknown> = {};
	if ("envelopeId" in input) updates.docusign_envelope_id = input.envelopeId ?? null;
	if (input.status) updates.status = input.status;
	if ("documentCount" in input) updates.document_count = input.documentCount ?? 0;
	if (input.billingActivationStatus) updates.billing_activation_status = input.billingActivationStatus;
	if ("billingCheckoutUrl" in input) updates.billing_checkout_url = input.billingCheckoutUrl ?? null;
	if ("billingCheckoutSessionId" in input) updates.billing_checkout_session_id = input.billingCheckoutSessionId ?? null;
	if ("billingErrorMessage" in input) updates.billing_error_message = input.billingErrorMessage ?? null;
	if ("completedAt" in input) updates.completed_at = input.completedAt ?? null;
	if ("declinedAt" in input) updates.declined_at = input.declinedAt ?? null;
	if ("voidedAt" in input) updates.voided_at = input.voidedAt ?? null;
	if ("lastSyncedAt" in input) updates.last_synced_at = input.lastSyncedAt ?? null;
	if ("errorMessage" in input) updates.error_message = input.errorMessage ?? null;
	if ("metadata" in input) updates.metadata = input.metadata ?? {};

	const { data, error } = await admin()
		.from("rental_signing_packets")
		.update(updates)
		.eq("id", input.packetId)
		.select("*, documents:rental_signing_packet_documents(*)")
		.single();
	return assertData(data as RentalSigningPacketRecord | null, error);
}

export async function createRentalSigningPacketDocument(input: {
	packetId: string;
	rentalId: string;
	templateId?: string | null;
	docusignDocumentId?: string | null;
	documentName: string;
	status?: RentalSigningPacketDocumentRecord["status"];
	bucket?: string | null;
	storagePath?: string | null;
	rentalDocumentId?: string | null;
	sortOrder?: number;
	metadata?: Record<string, unknown>;
}) {
	const { data, error } = await admin()
		.from("rental_signing_packet_documents")
		.insert({
			packet_id: input.packetId,
			rental_id: input.rentalId,
			template_id: input.templateId ?? null,
			docusign_document_id: input.docusignDocumentId ?? null,
			document_name: input.documentName,
			status: input.status ?? "pending",
			bucket: input.bucket ?? null,
			storage_path: input.storagePath ?? null,
			rental_document_id: input.rentalDocumentId ?? null,
			sort_order: input.sortOrder ?? 100,
			metadata: input.metadata ?? {},
		})
		.select("*")
		.single();
	return assertData(data as RentalSigningPacketDocumentRecord | null, error);
}

export async function updateRentalSigningPacketDocument(input: {
	documentId: string;
	docusignDocumentId?: string | null;
	documentName?: string;
	status?: RentalSigningPacketDocumentRecord["status"];
	bucket?: string | null;
	storagePath?: string | null;
	rentalDocumentId?: string | null;
	metadata?: Record<string, unknown>;
}) {
	const updates: Record<string, unknown> = {};
	if ("docusignDocumentId" in input) updates.docusign_document_id = input.docusignDocumentId ?? null;
	if ("documentName" in input) updates.document_name = input.documentName;
	if (input.status) updates.status = input.status;
	if ("bucket" in input) updates.bucket = input.bucket ?? null;
	if ("storagePath" in input) updates.storage_path = input.storagePath ?? null;
	if ("rentalDocumentId" in input) updates.rental_document_id = input.rentalDocumentId ?? null;
	if ("metadata" in input) updates.metadata = input.metadata ?? {};

	const { data, error } = await admin()
		.from("rental_signing_packet_documents")
		.update(updates)
		.eq("id", input.documentId)
		.select("*")
		.single();
	return assertData(data as RentalSigningPacketDocumentRecord | null, error);
}

export async function upsertDocuSignEvent(input: {
	eventHash: string;
	eventType: string;
	envelopeId?: string | null;
	packetId?: string | null;
	processingStatus?: DocuSignEventRecord["processing_status"];
	errorMessage?: string | null;
	rawPayload?: Record<string, unknown>;
	processedAt?: string | null;
}) {
	const { data, error } = await admin()
		.from("docusign_events")
		.upsert(
			{
				event_hash: input.eventHash,
				event_type: input.eventType,
				docusign_envelope_id: input.envelopeId ?? null,
				packet_id: input.packetId ?? null,
				processing_status: input.processingStatus ?? "pending",
				error_message: input.errorMessage ?? null,
				raw_payload: input.rawPayload ?? {},
				processed_at: input.processedAt ?? null,
			},
			{ onConflict: "event_hash" }
		)
		.select("*")
		.single();
	return assertData(data as DocuSignEventRecord | null, error);
}

export async function getDocuSignEventByHash(eventHash: string) {
	const { data, error } = await admin()
		.from("docusign_events")
		.select("*")
		.eq("event_hash", eventHash)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data as DocuSignEventRecord | null) ?? null;
}

function sortTimelineItems<T extends { timeline_items?: TimelineItemRecord[] }>(row: T) {
	const timelineItems = Array.isArray(row.timeline_items) ? [...row.timeline_items] : [];
	timelineItems.sort((left, right) => {
		if ((left.sort_order ?? 100) !== (right.sort_order ?? 100)) {
			return (left.sort_order ?? 100) - (right.sort_order ?? 100);
		}
		return String(left.created_at).localeCompare(String(right.created_at));
	});

	return {
		...row,
		timeline_items: timelineItems,
	};
}

export async function createTimelineItem(input: {
	tenantId: string;
	applicationId?: string | null;
	rentalId?: string | null;
	type: "milestone" | "action_required" | "message";
	itemKey?: string | null;
	stage?: "current" | "upcoming" | "completed";
	sortOrder?: number;
	title: string;
	description?: string | null;
	visibleToTenant?: boolean;
	dueAt?: string | null;
	completedAt?: string | null;
	ctaLabel?: string | null;
	ctaUrl?: string | null;
	createdByProfileId?: string | null;
	updatedByProfileId?: string | null;
	metadata?: Record<string, unknown>;
}) {
	const { data, error } = await admin()
		.from("timeline_items")
		.insert({
			tenant_id: input.tenantId,
			application_id: input.applicationId ?? null,
			rental_id: input.rentalId ?? null,
			type: input.type,
			item_key: input.itemKey ?? null,
			stage: input.stage ?? (input.completedAt ? "completed" : "upcoming"),
			sort_order: input.sortOrder ?? 100,
			title: input.title,
			description: input.description ?? null,
			visible_to_tenant: input.visibleToTenant ?? true,
			due_at: input.dueAt ?? null,
			completed_at: input.completedAt ?? null,
			cta_label: input.ctaLabel ?? null,
			cta_url: input.ctaUrl ?? null,
			created_by_profile_id: input.createdByProfileId ?? null,
			updated_by_profile_id: input.updatedByProfileId ?? null,
			metadata: input.metadata ?? {},
		})
		.select("*")
		.single();
	return assertData(data as TimelineItemRecord | null, error);
}

export async function listTimelineItemsByTenantId(tenantId: string) {
	const { data, error } = await admin()
		.from("timeline_items")
		.select("*")
		.eq("tenant_id", tenantId)
		.eq("visible_to_tenant", true)
		.order("sort_order", { ascending: true })
		.order("created_at", { ascending: true });
	if (error) throw new Error(error.message);
	return (data as TimelineItemRecord[]) ?? [];
}

export async function listAllTimelineItemsByTenantId(tenantId: string) {
	const { data, error } = await admin()
		.from("timeline_items")
		.select("*")
		.eq("tenant_id", tenantId)
		.order("sort_order", { ascending: true })
		.order("created_at", { ascending: true });
	if (error) throw new Error(error.message);
	return (data as TimelineItemRecord[]) ?? [];
}

export async function listTimelineItemsByTenantIds(tenantIds: string[]) {
	if (!tenantIds.length) {
		return [] as TimelineItemRecord[];
	}

	const { data, error } = await admin()
		.from("timeline_items")
		.select("*")
		.in("tenant_id", tenantIds)
		.order("sort_order", { ascending: true })
		.order("created_at", { ascending: true });
	if (error) throw new Error(error.message);
	return (data as TimelineItemRecord[]) ?? [];
}

export async function listTimelineItemsByApplicationId(applicationId: string) {
	const { data, error } = await admin()
		.from("timeline_items")
		.select("*")
		.eq("application_id", applicationId)
		.order("sort_order", { ascending: true })
		.order("created_at", { ascending: true });
	if (error) throw new Error(error.message);
	return (data as TimelineItemRecord[]) ?? [];
}

export async function getTimelineItemByKey(input: {
	tenantId: string;
	applicationId?: string | null;
	rentalId?: string | null;
	itemKey: string;
}) {
	const query = admin()
		.from("timeline_items")
		.select("*")
		.eq("tenant_id", input.tenantId)
		.eq("item_key", input.itemKey);

	if (input.applicationId) {
		query.eq("application_id", input.applicationId);
	} else {
		query.is("application_id", null);
	}

	if (input.rentalId) {
		query.eq("rental_id", input.rentalId);
	} else {
		query.is("rental_id", null);
	}

	const { data, error } = await query.maybeSingle();
	if (error) throw new Error(error.message);
	return (data as TimelineItemRecord | null) ?? null;
}

export async function updateTimelineItem(input: {
	timelineItemId: string;
	rentalId?: string | null;
	type?: "milestone" | "action_required" | "message";
	stage?: "current" | "upcoming" | "completed";
	title?: string;
	description?: string | null;
	visibleToTenant?: boolean;
	dueAt?: string | null;
	completedAt?: string | null;
	ctaLabel?: string | null;
	ctaUrl?: string | null;
	sortOrder?: number;
	metadata?: Record<string, unknown>;
	updatedByProfileId?: string | null;
}) {
	const updates: Record<string, unknown> = {};
	if (input.type) updates.type = input.type;
	if (input.stage) updates.stage = input.stage;
	if ("title" in input) updates.title = input.title;
	if ("description" in input) updates.description = input.description ?? null;
	if ("visibleToTenant" in input) updates.visible_to_tenant = input.visibleToTenant;
	if ("dueAt" in input) updates.due_at = input.dueAt ?? null;
	if ("completedAt" in input) updates.completed_at = input.completedAt ?? null;
	if ("ctaLabel" in input) updates.cta_label = input.ctaLabel ?? null;
	if ("ctaUrl" in input) updates.cta_url = input.ctaUrl ?? null;
	if ("sortOrder" in input) updates.sort_order = input.sortOrder;
	if ("metadata" in input) updates.metadata = input.metadata ?? {};
	if ("rentalId" in input) updates.rental_id = input.rentalId ?? null;
	if ("updatedByProfileId" in input) {
		updates.updated_by_profile_id = input.updatedByProfileId ?? null;
	}

	const { data, error } = await admin()
		.from("timeline_items")
		.update(updates)
		.eq("id", input.timelineItemId)
		.select("*")
		.single();
	return assertData(data as TimelineItemRecord | null, error);
}

export async function upsertTimelineItemByKey(input: {
	tenantId: string;
	applicationId?: string | null;
	rentalId?: string | null;
	itemKey: string;
	type: "milestone" | "action_required" | "message";
	stage?: "current" | "upcoming" | "completed";
	title: string;
	description?: string | null;
	visibleToTenant?: boolean;
	dueAt?: string | null;
	completedAt?: string | null;
	ctaLabel?: string | null;
	ctaUrl?: string | null;
	sortOrder?: number;
	metadata?: Record<string, unknown>;
	createdByProfileId?: string | null;
	updatedByProfileId?: string | null;
}) {
	const existing = await getTimelineItemByKey({
		tenantId: input.tenantId,
		applicationId: input.applicationId ?? null,
		rentalId: input.rentalId ?? null,
		itemKey: input.itemKey,
	});

	if (existing) {
		return updateTimelineItem({
			timelineItemId: existing.id,
			type: input.type,
			stage: input.stage,
			title: input.title,
			description: input.description ?? null,
			visibleToTenant: input.visibleToTenant ?? existing.visible_to_tenant,
			dueAt: input.dueAt ?? existing.due_at,
			completedAt:
				"completedAt" in input ? input.completedAt ?? null : existing.completed_at,
			ctaLabel: input.ctaLabel ?? existing.cta_label,
			ctaUrl: input.ctaUrl ?? existing.cta_url,
			sortOrder: input.sortOrder ?? existing.sort_order,
			metadata: {
				...(existing.metadata ?? {}),
				...(input.metadata ?? {}),
			},
			rentalId: input.rentalId ?? existing.rental_id ?? null,
			updatedByProfileId: input.updatedByProfileId ?? null,
		});
	}

	return createTimelineItem({
		tenantId: input.tenantId,
		applicationId: input.applicationId ?? null,
		rentalId: input.rentalId ?? null,
		itemKey: input.itemKey,
		type: input.type,
		stage: input.stage,
		title: input.title,
		description: input.description ?? null,
		visibleToTenant: input.visibleToTenant ?? true,
		dueAt: input.dueAt ?? null,
		completedAt: input.completedAt ?? null,
		ctaLabel: input.ctaLabel ?? null,
		ctaUrl: input.ctaUrl ?? null,
		sortOrder: input.sortOrder ?? 100,
		metadata: input.metadata ?? {},
		createdByProfileId: input.createdByProfileId ?? null,
		updatedByProfileId: input.updatedByProfileId ?? null,
	});
}

export async function listApplicationsByTenantId(tenantId: string) {
	const { data, error } = await admin()
		.from("applications")
		.select("*, documents:application_documents(*)")
		.eq("tenant_id", tenantId)
		.order("submitted_at", { ascending: false });
	if (error) throw new Error(error.message);
	return addSignedUrlsToDocuments(
		((data as (ApplicationRecord & { documents?: ApplicationDocumentRecord[] })[]) ??
			[]) as (ApplicationRecord & { documents?: ApplicationDocumentRecord[] })[]
	);
}

export async function listDetailedApplicationsByTenantId(tenantId: string) {
	const { data, error } = await admin()
		.from("applications")
		.select("*, documents:application_documents(*), timeline_items(*)")
		.eq("tenant_id", tenantId)
		.order("submitted_at", { ascending: false });
	if (error) throw new Error(error.message);

	const rows = await addSignedUrlsToDocuments((data ?? []) as any[]);
	return rows.map((row) => sortTimelineItems(row as any));
}

export async function listApplicationsByTenantIds(tenantIds: string[]) {
	if (!tenantIds.length) {
		return [] as ApplicationRecord[];
	}

	const { data, error } = await admin()
		.from("applications")
		.select("*")
		.in("tenant_id", tenantIds)
		.order("submitted_at", { ascending: false });
	if (error) throw new Error(error.message);
	return (data as ApplicationRecord[]) ?? [];
}

function rentalSelect() {
	return "*";
}

async function listApplicationsByIds(applicationIds: string[]) {
	if (!applicationIds.length) {
		return [] as ApplicationRecord[];
	}

	const { data, error } = await admin()
		.from("applications")
		.select("*, documents:application_documents(*), timeline_items(*)")
		.in("id", applicationIds);
	if (error) throw new Error(error.message);

	const rows = await addSignedUrlsToDocuments((data ?? []) as any[]);
	return rows.map((row) => sortTimelineItems(row as any)) as ApplicationRecord[];
}

async function listRentalDocumentsByRentalIds(rentalIds: string[]) {
	if (!rentalIds.length) {
		return [] as RentalDocumentRecord[];
	}

	const { data, error } = await admin()
		.from("rental_documents")
		.select("*")
		.in("rental_id", rentalIds)
		.order("created_at", { ascending: false });
	if (error) throw new Error(error.message);

	const rows = await addSignedUrlsToDocuments([
		{
			documents: ((data as RentalDocumentRecord[] | null) ?? []) as StorageDocumentRecord[],
		},
	]);

	return ((rows[0]?.documents as RentalDocumentRecord[] | undefined) ?? []) as RentalDocumentRecord[];
}

async function listTenantsByIds(tenantIds: string[]) {
	if (!tenantIds.length) {
		return [] as TenantRecord[];
	}

	const { data, error } = await admin()
		.from("tenants")
		.select("*")
		.in("id", tenantIds);
	if (error) throw new Error(error.message);

	return (data as TenantRecord[]) ?? [];
}

async function listAssignmentsByRentalIds(rentalIds: string[]) {
	if (!rentalIds.length) {
		return [] as AssignmentRecord[];
	}

	const { data, error } = await admin()
		.from("assignments")
		.select("*, trailer:trailers(*)")
		.in("rental_id", rentalIds);
	if (error) throw new Error(error.message);

	return (data as unknown as AssignmentRecord[]) ?? [];
}

async function listRequestedTrailerTypesByRentalIds(rentalIds: string[]) {
	if (!rentalIds.length) {
		return [] as RentalRequestedTrailerTypeRecord[];
	}

	const { data, error } = await admin()
		.from("rental_requested_trailer_types")
		.select("*")
		.in("rental_id", rentalIds)
		.order("sort_order", { ascending: true })
		.order("created_at", { ascending: true });
	if (error) throw new Error(error.message);

	return (data as RentalRequestedTrailerTypeRecord[]) ?? [];
}

async function listSigningPacketsByRentalIds(rentalIds: string[]) {
	if (!rentalIds.length) {
		return [] as RentalSigningPacketRecord[];
	}

	const { data, error } = await admin()
		.from("rental_signing_packets")
		.select("*, documents:rental_signing_packet_documents(*)")
		.in("rental_id", rentalIds)
		.order("created_at", { ascending: false });
	if (error) throw new Error(error.message);

	const packets = ((data as RentalSigningPacketRecord[] | null) ?? []).map(
		(packet) => ({
			...packet,
			documents: Array.isArray(packet.documents)
				? [...packet.documents].sort((left, right) => {
						if ((left.sort_order ?? 100) !== (right.sort_order ?? 100)) {
							return (left.sort_order ?? 100) - (right.sort_order ?? 100);
						}
						return String(left.created_at).localeCompare(String(right.created_at));
				  })
				: [],
		})
	);

	return packets;
}

async function listBillingInvoiceLinesByInvoiceIds(invoiceIds: string[]) {
	if (!invoiceIds.length) {
		return [] as BillingInvoiceLineRecord[];
	}

	const { data, error } = await admin()
		.from("billing_invoice_lines")
		.select("*")
		.in("invoice_id", invoiceIds)
		.order("created_at", { ascending: true });
	if (error) throw new Error(error.message);
	return (data as BillingInvoiceLineRecord[]) ?? [];
}

async function listBillingInvoicesByRentalIds(rentalIds: string[]) {
	if (!rentalIds.length) {
		return [] as BillingInvoiceRecord[];
	}

	const { data, error } = await admin()
		.from("billing_invoices")
		.select("*")
		.in("rental_id", rentalIds)
		.order("created_at", { ascending: false });
	if (error) throw new Error(error.message);

	const invoices = (data as BillingInvoiceRecord[]) ?? [];
	const invoiceLines = await listBillingInvoiceLinesByInvoiceIds(
		invoices.map((invoice) => invoice.id)
	);
	const linesByInvoiceId = new Map<string, BillingInvoiceLineRecord[]>();

	for (const line of invoiceLines) {
		const current = linesByInvoiceId.get(line.invoice_id) ?? [];
		current.push(line);
		linesByInvoiceId.set(line.invoice_id, current);
	}

	return invoices.map((invoice) => ({
		...invoice,
		lines: linesByInvoiceId.get(invoice.id) ?? [],
	}));
}

async function attachParentRentals(rentals: RentalRecord[]) {
	const parentIds = [...new Set(rentals.map((rental) => rental.parent_rental_id).filter(Boolean))];
	if (!parentIds.length) {
		return rentals.map((rental) => ({
			...rental,
			parent_rental: null,
		}));
	}

	const { data, error } = await admin()
		.from("rentals")
		.select("*")
		.in("id", parentIds);
	if (error) throw new Error(error.message);

	const parentMap = new Map(
		((data as RentalRecord[] | null) ?? []).map((rental) => [rental.id, rental])
	);

	return rentals.map((rental) => ({
		...rental,
		parent_rental: rental.parent_rental_id
			? parentMap.get(rental.parent_rental_id) ?? null
			: null,
	}));
}

async function hydrateRentals(rentals: RentalRecord[]) {
	if (!rentals.length) {
		return [] as RentalRecord[];
	}

	const rentalIds = rentals.map((rental) => rental.id);
	const tenantIds = [...new Set(rentals.map((rental) => rental.tenant_id).filter(Boolean))];
	const applicationIds = [
		...new Set(rentals.map((rental) => rental.application_id).filter(Boolean)),
	] as string[];

	const [
		tenants,
		applications,
		assignments,
		requestedTrailerTypes,
		documents,
		billingInvoices,
		signingPackets,
	] = await Promise.all([
		listTenantsByIds(tenantIds),
		listApplicationsByIds(applicationIds),
		listAssignmentsByRentalIds(rentalIds),
		listRequestedTrailerTypesByRentalIds(rentalIds),
		listRentalDocumentsByRentalIds(rentalIds),
		listBillingInvoicesByRentalIds(rentalIds),
		listSigningPacketsByRentalIds(rentalIds),
	]);

	const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]));
	const applicationById = new Map(
		applications.map((application) => [application.id, application]),
	);
	const assignmentsByRentalId = new Map<string, AssignmentRecord[]>();
	const requestedTrailerTypesByRentalId = new Map<
		string,
		RentalRequestedTrailerTypeRecord[]
	>();
	const documentsByRentalId = new Map<string, RentalDocumentRecord[]>();
	const billingInvoicesByRentalId = new Map<string, BillingInvoiceRecord[]>();
	const signingPacketsByRentalId = new Map<string, RentalSigningPacketRecord[]>();

	for (const assignment of assignments) {
		const current = assignmentsByRentalId.get(assignment.rental_id) ?? [];
		current.push(assignment);
		assignmentsByRentalId.set(assignment.rental_id, current);
	}

	for (const requestedTrailerType of requestedTrailerTypes) {
		const current =
			requestedTrailerTypesByRentalId.get(requestedTrailerType.rental_id) ?? [];
		current.push(requestedTrailerType);
		requestedTrailerTypesByRentalId.set(
			requestedTrailerType.rental_id,
			current,
		);
	}

	for (const document of documents) {
		const current = documentsByRentalId.get(document.rental_id) ?? [];
		current.push(document);
		documentsByRentalId.set(document.rental_id, current);
	}

	for (const invoice of billingInvoices) {
		if (!invoice.rental_id) continue;
		const current = billingInvoicesByRentalId.get(invoice.rental_id) ?? [];
		current.push(invoice);
		billingInvoicesByRentalId.set(invoice.rental_id, current);
	}

	for (const packet of signingPackets) {
		const current = signingPacketsByRentalId.get(packet.rental_id) ?? [];
		current.push(packet);
		signingPacketsByRentalId.set(packet.rental_id, current);
	}

	const rentalsWithRelations = rentals.map((rental) => ({
		...rental,
		tenant: tenantById.get(rental.tenant_id) ?? null,
		application: rental.application_id
			? applicationById.get(rental.application_id) ?? null
			: null,
		assignments: assignmentsByRentalId.get(rental.id) ?? [],
		requested_trailer_types:
			requestedTrailerTypesByRentalId.get(rental.id) ?? [],
		documents: documentsByRentalId.get(rental.id) ?? [],
		billing_invoices: billingInvoicesByRentalId.get(rental.id) ?? [],
		signing_packets: signingPacketsByRentalId.get(rental.id) ?? [],
	}));

	return attachParentRentals(rentalsWithRelations);
}

export async function listRentalsByTenantId(tenantId: string) {
	const { data, error } = await admin()
		.from("rentals")
		.select(rentalSelect())
		.eq("tenant_id", tenantId)
		.order("created_at", { ascending: false });
	if (error) throw new Error(error.message);
	return hydrateRentals((data as unknown as RentalRecord[]) ?? []);
}

export async function listRentalsByTenantIds(tenantIds: string[]) {
	if (!tenantIds.length) {
		return [] as RentalRecord[];
	}

	const { data, error } = await admin()
		.from("rentals")
		.select(rentalSelect())
		.in("tenant_id", tenantIds)
		.order("created_at", { ascending: false });
	if (error) throw new Error(error.message);
	return hydrateRentals((data as unknown as RentalRecord[]) ?? []);
}

export async function listAdminRentals() {
	const { data, error } = await admin()
		.from("rentals")
		.select(rentalSelect())
		.order("created_at", { ascending: false });
	if (error) throw new Error(error.message);
	return hydrateRentals((data as unknown as RentalRecord[]) ?? []);
}

export async function getRentalById(rentalId: string) {
	const { data, error } = await admin()
		.from("rentals")
		.select(rentalSelect())
		.eq("id", rentalId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	if (!data) return null;
	const [rental] = await hydrateRentals([data as unknown as RentalRecord]);
	return rental ?? null;
}

export async function getRentalByApplicationId(applicationId: string) {
	const { data, error } = await admin()
		.from("rentals")
		.select(rentalSelect())
		.eq("application_id", applicationId)
		.order("created_at", { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error) throw new Error(error.message);
	if (!data) return null;
	const [rental] = await hydrateRentals([data as unknown as RentalRecord]);
	return rental ?? null;
}

export async function createRental(input: {
	tenantId: string;
	applicationId?: string | null;
	status?: RentalStatus;
	billingStatus?: BillingStatus;
	billingFrequency?: BillingFrequency;
	rate?: number | null;
	depositAmount?: number | null;
	contractStartDate?: string | null;
	operationalStartDate?: string | null;
	endDate?: string | null;
	recordKind?: RentalRecordKind;
	requestKind?: RentalRequestKind;
	parentRentalId?: string | null;
	requestedTrailerCount?: number | null;
	requestedTrailerType?: string | null;
	requestSummary?: string | null;
	requestedByProfileId?: string | null;
	resolvedAt?: string | null;
	requestOutcome?: RentalRequestOutcome | null;
}) {
	const { data, error } = await admin()
		.from("rentals")
		.insert({
			tenant_id: input.tenantId,
			application_id: input.applicationId ?? null,
			status: input.status ?? "draft",
			billing_status: input.billingStatus ?? "draft",
			billing_frequency: input.billingFrequency ?? "monthly",
			rate: input.rate ?? null,
			deposit_amount: input.depositAmount ?? null,
			contract_start_date: input.contractStartDate ?? null,
			operational_start_date: input.operationalStartDate ?? null,
			end_date: input.endDate ?? null,
			record_kind: input.recordKind ?? "agreement",
			request_kind: input.requestKind ?? "admin_created",
			parent_rental_id: input.parentRentalId ?? null,
			requested_trailer_count: input.requestedTrailerCount ?? null,
			requested_trailer_type: input.requestedTrailerType ?? null,
			request_summary: input.requestSummary ?? null,
			requested_by_profile_id: input.requestedByProfileId ?? null,
			resolved_at: input.resolvedAt ?? null,
			request_outcome: input.requestOutcome ?? null,
		})
		.select(rentalSelect())
		.single();
	const rental = assertData(data as RentalRecord | null, error);
	const [hydratedRental] = await hydrateRentals([rental]);
	return hydratedRental;
}

export async function updateRental(input: {
	rentalId: string;
	tenantId?: string;
	status?: RentalStatus;
	billingStatus?: BillingStatus;
	billingFrequency?: BillingFrequency;
	rate?: number | null;
	depositAmount?: number | null;
	contractStartDate?: string | null;
	operationalStartDate?: string | null;
	endDate?: string | null;
	recordKind?: RentalRecordKind;
	requestKind?: RentalRequestKind;
	parentRentalId?: string | null;
	requestedTrailerCount?: number | null;
	requestedTrailerType?: string | null;
	requestSummary?: string | null;
	requestedByProfileId?: string | null;
	resolvedAt?: string | null;
	requestOutcome?: RentalRequestOutcome | null;
	stripeCustomerId?: string | null;
	stripeSubscriptionId?: string | null;
	stripePriceId?: string | null;
	stripeProductId?: string | null;
	currentPeriodEnd?: string | null;
	lastInvoiceId?: string | null;
}) {
	const updates: Record<string, unknown> = {};
	if ("tenantId" in input) updates.tenant_id = input.tenantId;
	if ("status" in input) updates.status = input.status;
	if ("billingStatus" in input) updates.billing_status = input.billingStatus;
	if ("billingFrequency" in input) updates.billing_frequency = input.billingFrequency;
	if ("rate" in input) updates.rate = input.rate ?? null;
	if ("depositAmount" in input) updates.deposit_amount = input.depositAmount ?? null;
	if ("contractStartDate" in input) updates.contract_start_date = input.contractStartDate ?? null;
	if ("operationalStartDate" in input) {
		updates.operational_start_date = input.operationalStartDate ?? null;
	}
	if ("endDate" in input) updates.end_date = input.endDate ?? null;
	if ("recordKind" in input) updates.record_kind = input.recordKind;
	if ("requestKind" in input) updates.request_kind = input.requestKind;
	if ("parentRentalId" in input) updates.parent_rental_id = input.parentRentalId ?? null;
	if ("requestedTrailerCount" in input) {
		updates.requested_trailer_count = input.requestedTrailerCount ?? null;
	}
	if ("requestedTrailerType" in input) {
		updates.requested_trailer_type = input.requestedTrailerType ?? null;
	}
	if ("requestSummary" in input) updates.request_summary = input.requestSummary ?? null;
	if ("requestedByProfileId" in input) {
		updates.requested_by_profile_id = input.requestedByProfileId ?? null;
	}
	if ("resolvedAt" in input) updates.resolved_at = input.resolvedAt ?? null;
	if ("requestOutcome" in input) updates.request_outcome = input.requestOutcome ?? null;
	if ("stripeCustomerId" in input) updates.stripe_customer_id = input.stripeCustomerId ?? null;
	if ("stripeSubscriptionId" in input) {
		updates.stripe_subscription_id = input.stripeSubscriptionId ?? null;
	}
	if ("stripePriceId" in input) updates.stripe_price_id = input.stripePriceId ?? null;
	if ("stripeProductId" in input) updates.stripe_product_id = input.stripeProductId ?? null;
	if ("currentPeriodEnd" in input) updates.current_period_end = input.currentPeriodEnd ?? null;
	if ("lastInvoiceId" in input) updates.last_invoice_id = input.lastInvoiceId ?? null;

	const { data, error } = await admin()
		.from("rentals")
		.update(updates)
		.eq("id", input.rentalId)
		.select(rentalSelect())
		.single();
	const rental = assertData(data as RentalRecord | null, error);
	const [hydratedRental] = await hydrateRentals([rental]);
	return hydratedRental;
}

export async function replaceRentalRequestedTrailerTypes(input: {
	rentalId: string;
	requestedTrailerTypes: Array<{
		trailerType: string;
		quantity: number;
		sortOrder?: number;
	}>;
}) {
	const { error: deleteError } = await admin()
		.from("rental_requested_trailer_types")
		.delete()
		.eq("rental_id", input.rentalId);
	if (deleteError) throw new Error(deleteError.message);

	const rows = input.requestedTrailerTypes.map((item, index) => ({
		rental_id: input.rentalId,
		trailer_type: item.trailerType,
		quantity: item.quantity,
		sort_order: item.sortOrder ?? (index + 1) * 10,
	}));

	if (!rows.length) return [] as RentalRequestedTrailerTypeRecord[];

	const { data, error } = await admin()
		.from("rental_requested_trailer_types")
		.insert(rows)
		.select("*")
		.order("sort_order", { ascending: true });
	if (error) throw new Error(error.message);

	return (data as RentalRequestedTrailerTypeRecord[]) ?? [];
}

export async function getRentalByStripeSubscriptionId(stripeSubscriptionId: string) {
	const { data, error } = await admin()
		.from("rentals")
		.select(rentalSelect())
		.eq("stripe_subscription_id", stripeSubscriptionId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	if (!data) return null;
	const [rental] = await hydrateRentals([data as unknown as RentalRecord]);
	return rental ?? null;
}

export async function getRentalByLastInvoiceId(stripeInvoiceId: string) {
	const { data, error } = await admin()
		.from("rentals")
		.select(rentalSelect())
		.eq("last_invoice_id", stripeInvoiceId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	if (!data) return null;
	const [rental] = await hydrateRentals([data as unknown as RentalRecord]);
	return rental ?? null;
}

export async function getBillingAccountByTenantId(tenantId: string) {
	const { data, error } = await admin()
		.from("billing_accounts")
		.select("*")
		.eq("tenant_id", tenantId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data as BillingAccountRecord | null) ?? null;
}

export async function getBillingAccountByStripeCustomerId(stripeCustomerId: string) {
	const { data, error } = await admin()
		.from("billing_accounts")
		.select("*")
		.eq("stripe_customer_id", stripeCustomerId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data as BillingAccountRecord | null) ?? null;
}

export async function upsertBillingAccount(input: {
	tenantId: string;
	stripeCustomerId?: string | null;
	defaultCurrency?: string | null;
}) {
	const { data, error } = await admin()
		.from("billing_accounts")
		.upsert(
			{
				tenant_id: input.tenantId,
				stripe_customer_id: input.stripeCustomerId ?? null,
				default_currency: input.defaultCurrency ?? "usd",
			},
			{ onConflict: "tenant_id" }
		)
		.select("*")
		.single();
	return assertData(data as BillingAccountRecord | null, error);
}

export async function getBillingInvoiceByStripeInvoiceId(stripeInvoiceId: string) {
	const { data, error } = await admin()
		.from("billing_invoices")
		.select("*")
		.eq("stripe_invoice_id", stripeInvoiceId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	if (!data) return null;
	const lines = await listBillingInvoiceLinesByInvoiceIds([data.id]);
	return {
		...(data as BillingInvoiceRecord),
		lines,
	};
}

export async function listBillingInvoicesByRentalId(rentalId: string) {
	return listBillingInvoicesByRentalIds([rentalId]);
}

export async function upsertBillingInvoice(input: {
	tenantId: string;
	rentalId?: string | null;
	stripeInvoiceId: string;
	stripeCustomerId?: string | null;
	stripeSubscriptionId?: string | null;
	status: string;
	billingReason?: string | null;
	collectionMethod?: string | null;
	currency?: string | null;
	amountDue?: number | null;
	amountPaid?: number | null;
	amountRemaining?: number | null;
	hostedInvoiceUrl?: string | null;
	invoicePdfUrl?: string | null;
	periodStart?: string | null;
	periodEnd?: string | null;
	dueAt?: string | null;
	paidAt?: string | null;
	rawPayload?: Record<string, unknown>;
}) {
	const { data, error } = await admin()
		.from("billing_invoices")
		.upsert(
			{
				tenant_id: input.tenantId,
				rental_id: input.rentalId ?? null,
				stripe_invoice_id: input.stripeInvoiceId,
				stripe_customer_id: input.stripeCustomerId ?? null,
				stripe_subscription_id: input.stripeSubscriptionId ?? null,
				status: input.status,
				billing_reason: input.billingReason ?? null,
				collection_method: input.collectionMethod ?? null,
				currency: input.currency ?? "usd",
				amount_due: input.amountDue ?? 0,
				amount_paid: input.amountPaid ?? 0,
				amount_remaining: input.amountRemaining ?? 0,
				hosted_invoice_url: input.hostedInvoiceUrl ?? null,
				invoice_pdf_url: input.invoicePdfUrl ?? null,
				period_start: input.periodStart ?? null,
				period_end: input.periodEnd ?? null,
				due_at: input.dueAt ?? null,
				paid_at: input.paidAt ?? null,
				raw_payload: input.rawPayload ?? {},
			},
			{ onConflict: "stripe_invoice_id" }
		)
		.select("*")
		.single();
	return assertData(data as BillingInvoiceRecord | null, error);
}

export async function replaceBillingInvoiceLines(input: {
	invoiceId: string;
	lines: Array<{
		tenantId: string;
		rentalId?: string | null;
		stripeLineItemId?: string | null;
		sourceType?: BillingInvoiceLineSource;
		description?: string | null;
		amount?: number | null;
		quantity?: number | null;
		currency?: string | null;
		periodStart?: string | null;
		periodEnd?: string | null;
		metadata?: Record<string, unknown>;
	}>;
}) {
	const client = admin();
	const { error: deleteError } = await client
		.from("billing_invoice_lines")
		.delete()
		.eq("invoice_id", input.invoiceId);
	if (deleteError) throw new Error(deleteError.message);

	if (!input.lines.length) {
		return [] as BillingInvoiceLineRecord[];
	}

	const { data, error } = await client
		.from("billing_invoice_lines")
		.insert(
			input.lines.map((line) => ({
				invoice_id: input.invoiceId,
				tenant_id: line.tenantId,
				rental_id: line.rentalId ?? null,
				stripe_line_item_id: line.stripeLineItemId ?? null,
				source_type: line.sourceType ?? "rental_charge",
				description: line.description ?? null,
				amount: line.amount ?? 0,
				quantity: line.quantity ?? null,
				currency: line.currency ?? "usd",
				period_start: line.periodStart ?? null,
				period_end: line.periodEnd ?? null,
				metadata: line.metadata ?? {},
			}))
		)
		.select("*");
	if (error) throw new Error(error.message);
	return (data as BillingInvoiceLineRecord[]) ?? [];
}

export async function getStripeEventByEventId(stripeEventId: string) {
	const { data, error } = await admin()
		.from("stripe_events")
		.select("*")
		.eq("stripe_event_id", stripeEventId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data as StripeEventRecord | null) ?? null;
}

export async function createStripeEvent(input: {
	stripeEventId: string;
	eventType: string;
	processingStatus?: StripeEventRecord["processing_status"];
	tenantId?: string | null;
	rentalId?: string | null;
	billingInvoiceId?: string | null;
	rawPayload?: Record<string, unknown>;
}) {
	const { data, error } = await admin()
		.from("stripe_events")
		.insert({
			stripe_event_id: input.stripeEventId,
			event_type: input.eventType,
			processing_status: input.processingStatus ?? "pending",
			tenant_id: input.tenantId ?? null,
			rental_id: input.rentalId ?? null,
			billing_invoice_id: input.billingInvoiceId ?? null,
			raw_payload: input.rawPayload ?? {},
		})
		.select("*")
		.single();
	return assertData(data as StripeEventRecord | null, error);
}

export async function updateStripeEvent(input: {
	stripeEventId: string;
	processingStatus: StripeEventRecord["processing_status"];
	tenantId?: string | null;
	rentalId?: string | null;
	billingInvoiceId?: string | null;
	errorMessage?: string | null;
	processedAt?: string | null;
}) {
	const updates: Record<string, unknown> = {
		processing_status: input.processingStatus,
	};

	if ("tenantId" in input) updates.tenant_id = input.tenantId ?? null;
	if ("rentalId" in input) updates.rental_id = input.rentalId ?? null;
	if ("billingInvoiceId" in input) {
		updates.billing_invoice_id = input.billingInvoiceId ?? null;
	}
	if ("errorMessage" in input) updates.error_message = input.errorMessage ?? null;
	if ("processedAt" in input) updates.processed_at = input.processedAt ?? null;

	const { data, error } = await admin()
		.from("stripe_events")
		.update(updates)
		.eq("stripe_event_id", input.stripeEventId)
		.select("*")
		.single();
	return assertData(data as StripeEventRecord | null, error);
}

export async function deleteRental(rentalId: string) {
	const { error } = await admin().from("rentals").delete().eq("id", rentalId);
	if (error) throw new Error(error.message);
}

export async function createAssignment(input: {
	rentalId: string;
	trailerId: string;
	status?: "active" | "expired" | "cancelled";
	startDate?: string | null;
	endDate?: string | null;
	notes?: string | null;
}) {
	const { data, error } = await admin()
		.from("assignments")
		.insert({
			rental_id: input.rentalId,
			trailer_id: input.trailerId,
			status: input.status ?? "active",
			start_date: input.startDate ?? null,
			end_date: input.endDate ?? null,
			notes: input.notes ?? null,
		})
		.select("*, trailer:trailers(*)")
		.single();
	return assertData(data as AssignmentRecord | null, error);
}

export async function updateAssignment(input: {
	assignmentId: string;
	rentalId?: string;
	status?: "active" | "expired" | "cancelled";
	startDate?: string | null;
	endDate?: string | null;
	notes?: string | null;
}) {
	const updates: Record<string, unknown> = {};
	if ("rentalId" in input) updates.rental_id = input.rentalId;
	if ("status" in input) updates.status = input.status;
	if ("startDate" in input) updates.start_date = input.startDate ?? null;
	if ("endDate" in input) updates.end_date = input.endDate ?? null;
	if ("notes" in input) updates.notes = input.notes ?? null;

	const { data, error } = await admin()
		.from("assignments")
		.update(updates)
		.eq("id", input.assignmentId)
		.select("*, trailer:trailers(*)")
		.single();
	return assertData(data as AssignmentRecord | null, error);
}

export async function listActiveAssignmentsByTrailerIds(trailerIds: string[]) {
	if (!trailerIds.length) {
		return [] as AssignmentRecord[];
	}

	const { data, error } = await admin()
		.from("assignments")
		.select("*, rental:rentals(*)")
		.in("trailer_id", trailerIds)
		.eq("status", "active");
	if (error) throw new Error(error.message);
	return (data as unknown as AssignmentRecord[]) ?? [];
}

export async function listTrailers() {
	const { data, error } = await admin()
		.from("trailers")
		.select("*, assignments(*, rental:rentals(*, tenant:tenants(*)))")
		.order("created_at", { ascending: false });
	if (error) throw new Error(error.message);
	return (data as unknown as TrailerRecord[]) ?? [];
}

export async function getTrailerById(trailerId: string) {
	const { data, error } = await admin()
		.from("trailers")
		.select("*, assignments(*, rental:rentals(*, tenant:tenants(*)))")
		.eq("id", trailerId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data as unknown as TrailerRecord | null) ?? null;
}

export async function createTrailer(input: {
	trailerCode?: string | null;
	trailerType: string;
	plateNumber?: string | null;
	vin?: string | null;
	status?: TrailerStatus;
}) {
	const { data, error } = await admin()
		.from("trailers")
		.insert({
			trailer_code: input.trailerCode ?? null,
			trailer_type: input.trailerType,
			plate_number: input.plateNumber ?? null,
			vin: input.vin ?? null,
			status: input.status ?? "available",
		})
		.select("*")
		.single();
	return assertData(data as TrailerRecord | null, error);
}

export async function updateTrailer(input: {
	trailerId: string;
	trailerCode?: string | null;
	trailerType?: string | null;
	plateNumber?: string | null;
	vin?: string | null;
	status?: TrailerStatus;
}) {
	const updates: Record<string, unknown> = {};
	if ("trailerCode" in input) updates.trailer_code = input.trailerCode ?? null;
	if ("trailerType" in input) updates.trailer_type = input.trailerType ?? null;
	if ("plateNumber" in input) updates.plate_number = input.plateNumber ?? null;
	if ("vin" in input) updates.vin = input.vin ?? null;
	if ("status" in input) updates.status = input.status;

	const { data, error } = await admin()
		.from("trailers")
		.update(updates)
		.eq("id", input.trailerId)
		.select("*, assignments(*, rental:rentals(*, tenant:tenants(*)))")
		.single();
	return assertData(data as TrailerRecord | null, error);
}

export async function listApplications() {
	const { data, error } = await admin()
		.from("applications")
		.select("*, tenant:tenants(*), documents:application_documents(*)")
		.order("submitted_at", { ascending: false });
	if (error) throw new Error(error.message);
	return addSignedUrlsToDocuments((data ?? []) as any[]);
}

export async function listCommunicationEventsByTenantId(tenantId: string) {
	const { data, error } = await admin()
		.from("communication_events")
		.select("*")
		.eq("tenant_id", tenantId)
		.order("created_at", { ascending: false });
	if (error) throw new Error(error.message);
	return (data as CommunicationEventRecord[]) ?? [];
}

export async function listCommunicationEventsByRentalId(rentalId: string) {
	const { data, error } = await admin()
		.from("communication_events")
		.select("*")
		.eq("rental_id", rentalId)
		.order("created_at", { ascending: false });
	if (error) throw new Error(error.message);
	return (data as CommunicationEventRecord[]) ?? [];
}

export async function listCommunicationEventsByTenantIds(tenantIds: string[]) {
	if (!tenantIds.length) {
		return [] as CommunicationEventRecord[];
	}

	const { data, error } = await admin()
		.from("communication_events")
		.select("*")
		.in("tenant_id", tenantIds)
		.order("created_at", { ascending: false });
	if (error) throw new Error(error.message);
	return (data as CommunicationEventRecord[]) ?? [];
}

export async function getApplicationById(applicationId: string) {
	const { data, error } = await admin()
		.from("applications")
		.select("*, tenant:tenants(*), documents:application_documents(*), timeline_items(*)")
		.eq("id", applicationId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	if (!data) return null;
	const [row] = await addSignedUrlsToDocuments([data as any]);
	return sortTimelineItems(row as any);
}

export async function updateApplicationReview(input: {
	applicationId: string;
	status: string;
	reviewNotes?: string | null;
	decisionByProfileId?: string | null;
}) {
	const { data, error } = await admin()
		.from("applications")
		.update({
			status: input.status,
			review_notes: input.reviewNotes ?? null,
			reviewed_at: new Date().toISOString(),
			decision_by_profile_id: input.decisionByProfileId ?? null,
		})
		.eq("id", input.applicationId)
		.select("*")
		.single();
	return assertData(data as ApplicationRecord | null, error);
}

export async function createTenantMembership(input: {
	tenantId: string;
	profileId: string;
	role: TenantRole;
	invitationStatus?: string;
	isActive?: boolean;
}) {
	const { data, error } = await admin()
		.from("tenant_memberships")
		.upsert(
			{
				tenant_id: input.tenantId,
				profile_id: input.profileId,
				role: input.role,
				invitation_status: input.invitationStatus ?? "active",
				is_active: input.isActive ?? true,
			},
			{ onConflict: "tenant_id,profile_id" }
		)
		.select("*, tenant:tenants(*), permissions:tenant_membership_permissions(*)")
		.single();
	return assertData(data as TenantMembershipRecord | null, error);
}

export async function updateTenantMembership(input: {
	membershipId: string;
	role?: TenantRole;
	invitationStatus?: string;
	isActive?: boolean;
}) {
	const updates: Record<string, unknown> = {};
	if (input.role) updates.role = input.role;
	if (typeof input.invitationStatus === "string") {
		updates.invitation_status = input.invitationStatus;
	}
	if (typeof input.isActive === "boolean") updates.is_active = input.isActive;

	const { data, error } = await admin()
		.from("tenant_memberships")
		.update(updates)
		.eq("id", input.membershipId)
		.select("*, tenant:tenants(*), permissions:tenant_membership_permissions(*)")
		.single();
	return assertData(data as TenantMembershipRecord | null, error);
}

export async function replaceTenantMembershipPermissions(input: {
	membershipId: string;
	permissions: TenantPermission[];
}) {
	const client = admin();
	const { error: deleteError } = await client
		.from("tenant_membership_permissions")
		.delete()
		.eq("membership_id", input.membershipId);

	if (deleteError) throw new Error(deleteError.message);

	if (!input.permissions.length) {
		return [] as TenantMembershipPermissionRecord[];
	}

	const uniquePermissions = [...new Set(input.permissions)];
	const { data, error } = await client
		.from("tenant_membership_permissions")
		.insert(
			uniquePermissions.map((permission) => ({
				membership_id: input.membershipId,
				permission,
			}))
		)
		.select("*");

	if (error) throw new Error(error.message);
	return (data as TenantMembershipPermissionRecord[]) ?? [];
}

export async function listTenantMembersByTenantId(tenantId: string) {
	const { data, error } = await admin()
		.from("tenant_memberships")
		.select("*, profile:profiles(*), permissions:tenant_membership_permissions(*)")
		.eq("tenant_id", tenantId)
		.order("created_at", { ascending: true });
	if (error) throw new Error(error.message);
	return (data ??
		[]) as (TenantMembershipRecord & { profile?: ProfileRecord | null })[];
}

export async function countActiveOwnersForTenant(tenantId: string) {
	const { count, error } = await admin()
		.from("tenant_memberships")
		.select("*", { count: "exact", head: true })
		.eq("tenant_id", tenantId)
		.eq("role", "account_owner")
		.eq("is_active", true)
		.eq("invitation_status", "active");

	if (error) throw new Error(error.message);
	return count ?? 0;
}

export async function createTenantInvitation(input: {
	tenantId: string;
	invitedEmail: string;
	invitedByProfileId?: string | null;
	targetRole: TenantRole;
	permissionSnapshot?: TenantPermission[];
	expiresAt?: string | null;
}) {
	const normalizedEmail = normalizeEmail(input.invitedEmail);
	const existing = await admin()
		.from("tenant_invitations")
		.select("id")
		.eq("tenant_id", input.tenantId)
		.ilike("invited_email", normalizedEmail)
		.eq("status", "pending")
		.maybeSingle();

	if (existing.error) {
		throw new Error(existing.error.message);
	}

	if (existing.data?.id) {
		return updateTenantInvitation({
			invitationId: existing.data.id,
			targetRole: input.targetRole,
			permissionSnapshot: input.permissionSnapshot ?? [],
			status: "pending",
			expiresAt: input.expiresAt ?? null,
			acceptedAt: null,
			acceptedByProfileId: null,
			revokedAt: null,
		});
	}

	const { data, error } = await admin()
		.from("tenant_invitations")
		.insert({
			tenant_id: input.tenantId,
			invited_email: normalizedEmail,
			invited_by_profile_id: input.invitedByProfileId ?? null,
			target_role: input.targetRole,
			permission_snapshot: input.permissionSnapshot ?? [],
			status: "pending",
			expires_at: input.expiresAt ?? null,
			accepted_at: null,
			accepted_by_profile_id: null,
			revoked_at: null,
		})
		.select("*, tenant:tenants(*), invited_by_profile:profiles!tenant_invitations_invited_by_profile_id_fkey(*)")
		.single();
	if (error) throw new Error(error.message);
	return data as TenantInvitationRecord;
}

export async function listPendingTenantInvitationsByEmail(email: string) {
	const { data, error } = await admin()
		.from("tenant_invitations")
		.select("*, tenant:tenants(*), invited_by_profile:profiles!tenant_invitations_invited_by_profile_id_fkey(*)")
		.ilike("invited_email", normalizeEmail(email))
		.eq("status", "pending")
		.order("created_at", { ascending: true });
	if (error) throw new Error(error.message);
	return (data as TenantInvitationRecord[]) ?? [];
}

export async function listTenantInvitationsByTenantId(tenantId: string) {
	const { data, error } = await admin()
		.from("tenant_invitations")
		.select("*, tenant:tenants(*), invited_by_profile:profiles!tenant_invitations_invited_by_profile_id_fkey(*)")
		.eq("tenant_id", tenantId)
		.order("created_at", { ascending: false });
	if (error) throw new Error(error.message);
	return (data as TenantInvitationRecord[]) ?? [];
}

export async function getTenantInvitationById(invitationId: string) {
	const { data, error } = await admin()
		.from("tenant_invitations")
		.select("*, tenant:tenants(*), invited_by_profile:profiles!tenant_invitations_invited_by_profile_id_fkey(*)")
		.eq("id", invitationId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	return (data as TenantInvitationRecord | null) ?? null;
}

export async function updateTenantInvitation(input: {
	invitationId: string;
	status?: TenantInvitationRecord["status"];
	acceptedByProfileId?: string | null;
	acceptedAt?: string | null;
	revokedAt?: string | null;
	expiresAt?: string | null;
	permissionSnapshot?: TenantPermission[];
	targetRole?: TenantRole;
}) {
	const updates: Record<string, unknown> = {};
	if (input.status) updates.status = input.status;
	if ("acceptedByProfileId" in input) {
		updates.accepted_by_profile_id = input.acceptedByProfileId ?? null;
	}
	if ("acceptedAt" in input) updates.accepted_at = input.acceptedAt ?? null;
	if ("revokedAt" in input) updates.revoked_at = input.revokedAt ?? null;
	if ("expiresAt" in input) updates.expires_at = input.expiresAt ?? null;
	if (input.permissionSnapshot) updates.permission_snapshot = input.permissionSnapshot;
	if (input.targetRole) updates.target_role = input.targetRole;

	const { data, error } = await admin()
		.from("tenant_invitations")
		.update(updates)
		.eq("id", input.invitationId)
		.select("*, tenant:tenants(*), invited_by_profile:profiles!tenant_invitations_invited_by_profile_id_fkey(*)")
		.single();
	if (error) throw new Error(error.message);
	return data as TenantInvitationRecord;
}

export async function upsertStaffMembership(input: {
	profileId: string;
	role: "staff_admin" | "staff_ops";
}) {
	const { data, error } = await admin()
		.from("staff_memberships")
		.upsert(
			{
				profile_id: input.profileId,
				role: input.role,
				is_active: true,
			},
			{ onConflict: "profile_id" }
		)
		.select("*")
		.single();
	return assertData(data as StaffMembershipRecord | null, error);
}

export async function getApplicationSummaryCounts() {
	const [
		{ count: draftRentalsCount, error: draftRentalsError },
		{ count: customerReviewCount, error: customerReviewError },
		{ count: changesPendingCount, error: changesPendingError },
		{ count: awaitingPaymentCount, error: awaitingPaymentError },
		{ count: liveAgreementCount, error: liveAgreementError },
		{ count: staleTenantsCount, error: staleTenantsError },
		{ count: suspendedAgreementCount, error: suspendedAgreementError },
	] = await Promise.all([
		admin()
			.from("rentals")
			.select("*", { count: "exact", head: true })
			.eq("record_kind", "request")
			.eq("status", "draft"),
		admin()
			.from("rentals")
			.select("*", { count: "exact", head: true })
			.eq("status", "customer_review"),
		admin()
			.from("rentals")
			.select("*", { count: "exact", head: true })
			.eq("status", "changes_pending"),
		admin()
			.from("rentals")
			.select("*", { count: "exact", head: true })
			.eq("record_kind", "agreement")
			.eq("status", "awaiting_first_payment"),
		admin()
			.from("rentals")
			.select("*", { count: "exact", head: true })
			.eq("record_kind", "agreement")
			.in("status", ["active", "past_due", "suspended"]),
		admin()
			.from("tenants")
			.select("*", { count: "exact", head: true })
			.eq("status", "stale"),
		admin()
			.from("rentals")
			.select("*", { count: "exact", head: true })
			.eq("record_kind", "agreement")
			.in("status", ["past_due", "suspended"]),
	]);

	if (draftRentalsError) throw new Error(draftRentalsError.message);
	if (customerReviewError) throw new Error(customerReviewError.message);
	if (changesPendingError) throw new Error(changesPendingError.message);
	if (awaitingPaymentError) throw new Error(awaitingPaymentError.message);
	if (liveAgreementError) throw new Error(liveAgreementError.message);
	if (staleTenantsError) throw new Error(staleTenantsError.message);
	if (suspendedAgreementError) throw new Error(suspendedAgreementError.message);

	return {
		draftRentals: draftRentalsCount ?? 0,
		customerReview: customerReviewCount ?? 0,
		changesPending: changesPendingCount ?? 0,
		awaitingFirstPayment: awaitingPaymentCount ?? 0,
		liveAgreements: liveAgreementCount ?? 0,
		staleTenants: staleTenantsCount ?? 0,
		billingAttention: suspendedAgreementCount ?? 0,
	};
}
