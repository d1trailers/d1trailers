import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";
import type {
	ApplicationSubmissionInput,
	RequiredApplicationDocumentField,
} from "@/lib/contracts/application";
import type {
	TenantPermission,
	TenantRole,
} from "@/lib/contracts/account";
import type { InterestSubmissionInput } from "@/lib/contracts/interest";

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
	recipient_email: string;
	type: string;
	status: string;
	subject: string | null;
	provider: string | null;
	provider_message_id: string | null;
	error_message: string | null;
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
};

export type TimelineItemRecord = {
	id: string;
	tenant_id: string;
	type: string;
	title: string;
	description: string | null;
	visible_to_tenant: boolean;
	due_at: string | null;
	completed_at: string | null;
	cta_label: string | null;
	cta_url: string | null;
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
	const { data, error } = await admin()
		.from("profiles")
		.upsert(
			{
				id: input.id,
				email: normalizeEmail(input.email),
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
	status:
		| "lead"
		| "applied"
		| "under_review"
		| "feedback_requested"
		| "approved"
		| "awaiting_first_payment"
		| "active"
		| "past_due"
		| "suspended"
		| "closed";
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
	tenantId: string,
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
			status: "applied",
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

export async function uploadApplicationFile(input: {
	applicationId: string;
	documentField: RequiredApplicationDocumentField;
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

async function addSignedUrlsToDocuments<T extends { documents?: ApplicationDocumentRecord[] }>(
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

export async function createTimelineItem(input: {
	tenantId: string;
	applicationId?: string | null;
	type: "milestone" | "action_required" | "message";
	title: string;
	description?: string | null;
	visibleToTenant?: boolean;
	dueAt?: string | null;
	completedAt?: string | null;
	ctaLabel?: string | null;
	ctaUrl?: string | null;
	metadata?: Record<string, unknown>;
}) {
	const { data, error } = await admin()
		.from("timeline_items")
		.insert({
			tenant_id: input.tenantId,
			application_id: input.applicationId ?? null,
			type: input.type,
			title: input.title,
			description: input.description ?? null,
			visible_to_tenant: input.visibleToTenant ?? true,
			due_at: input.dueAt ?? null,
			completed_at: input.completedAt ?? null,
			cta_label: input.ctaLabel ?? null,
			cta_url: input.ctaUrl ?? null,
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
		.order("created_at", { ascending: true });
	if (error) throw new Error(error.message);
	return (data as TimelineItemRecord[]) ?? [];
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

export async function listRentalsByTenantId(tenantId: string) {
	const { data, error } = await admin()
		.from("rentals")
		.select("*, assignments(*, trailer:trailers(*))")
		.eq("tenant_id", tenantId)
		.order("created_at", { ascending: false });
	if (error) throw new Error(error.message);
	return data ?? [];
}

export async function listApplications() {
	const { data, error } = await admin()
		.from("applications")
		.select("*, tenant:tenants(*), documents:application_documents(*)")
		.order("submitted_at", { ascending: false });
	if (error) throw new Error(error.message);
	return addSignedUrlsToDocuments((data ?? []) as any[]);
}

export async function getApplicationById(applicationId: string) {
	const { data, error } = await admin()
		.from("applications")
		.select("*, tenant:tenants(*), documents:application_documents(*)")
		.eq("id", applicationId)
		.maybeSingle();
	if (error) throw new Error(error.message);
	if (!data) return null;
	const [row] = await addSignedUrlsToDocuments([data as any]);
	return row;
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
	const { count: leadsCount, error: leadsError } = await admin()
		.from("tenants")
		.select("*", { count: "exact", head: true })
		.eq("status", "lead");
	if (leadsError) throw new Error(leadsError.message);

	const { count: appliedCount, error: appliedError } = await admin()
		.from("applications")
		.select("*", { count: "exact", head: true })
		.in("status", ["applied", "under_review", "feedback_requested"]);
	if (appliedError) throw new Error(appliedError.message);

	const { count: approvedCount, error: approvedError } = await admin()
		.from("applications")
		.select("*", { count: "exact", head: true })
		.in("status", ["approved", "awaiting_first_payment"]);
	if (approvedError) throw new Error(approvedError.message);

	const { count: activeTenantsCount, error: activeError } = await admin()
		.from("tenants")
		.select("*", { count: "exact", head: true })
		.in("status", ["active", "past_due", "suspended"]);
	if (activeError) throw new Error(activeError.message);

	return {
		leads: leadsCount ?? 0,
		applicationsInReview: appliedCount ?? 0,
		approvedAwaitingActivation: approvedCount ?? 0,
		activeTenants: activeTenantsCount ?? 0,
	};
}
