import type { TenantPermission } from "@/lib/contracts/account";
import { createClient } from "@/lib/supabase/server";
import { getStaffBootstrapEmails } from "@/lib/server/env";
import {
	createTenantMembership,
	ensureProfile,
	getProfileById,
	getStaffMembershipByProfileId,
	getTenantMembershipsByProfileId,
	listPendingTenantInvitationsByEmail,
	replaceTenantMembershipPermissions,
	type ProfileRecord,
	type StaffMembershipRecord,
	type TenantMembershipRecord,
	type TenantMembershipPermissionRecord,
	type TenantRecord,
	updateProfileLastActiveTenant,
	updateTenantInvitation,
	upsertStaffMembership,
} from "@/lib/server/repos/platform";

export type TenantMembershipContext = TenantMembershipRecord & {
	tenant: TenantRecord;
	permissions: TenantMembershipPermissionRecord[];
};

export type UserContext = {
	userId: string;
	email: string;
	profile: ProfileRecord | null;
	staffMembership: StaffMembershipRecord | null;
	tenantMemberships: TenantMembershipContext[];
	activeTenantMembership: TenantMembershipContext | null;
	primaryTenantMembership: TenantMembershipContext | null;
};

const ACTIVE_PORTAL_TENANT_STATUSES = new Set(["active", "past_due", "suspended"]);
const PORTAL_BASE_PERMISSIONS = new Set<TenantPermission>([
	"view_rentals",
	"view_documents",
	"view_billing",
	"view_timeline",
	"manage_pickup",
]);
const STAFF_BOOTSTRAP_EMAILS = new Set(getStaffBootstrapEmails());

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

function isExpectedUnauthenticatedError(error: { message?: string; name?: string } | null) {
	if (!error) return false;

	const message = String(error.message ?? "").toLowerCase();
	const name = String(error.name ?? "").toLowerCase();

	return (
		name.includes("authsessionmissingerror") ||
		message.includes("auth session missing") ||
		message.includes("session missing") ||
		message.includes("refresh token not found") ||
		message.includes("invalid refresh token") ||
		message.includes("jwt expired") ||
		message.includes("jwt malformed")
	);
}

function normalizeMembership(membership: TenantMembershipRecord): TenantMembershipContext | null {
	if (!membership.tenant) return null;

	return {
		...membership,
		tenant: membership.tenant,
		permissions: Array.isArray(membership.permissions) ? membership.permissions : [],
	};
}

function pickActiveMembership(
	tenantMemberships: TenantMembershipContext[],
	lastActiveTenantId: string | null | undefined
) {
	if (lastActiveTenantId) {
		const matchingMembership = tenantMemberships.find(
			(membership) => membership.tenant_id === lastActiveTenantId
		);
		if (matchingMembership) {
			return matchingMembership;
		}
	}

	return (
		tenantMemberships.find((membership) => membership.role === "account_owner") ??
		tenantMemberships[0] ??
		null
	);
}

export function getMembershipPermissions(membership: TenantMembershipContext | null) {
	if (!membership) return [] as TenantPermission[];
	if (membership.role === "account_owner") {
		return [
			"view_rentals",
			"view_documents",
			"view_billing",
			"view_timeline",
			"manage_pickup",
			"manage_members",
		] satisfies TenantPermission[];
	}

	return membership.permissions.map((permission) => permission.permission);
}

export function hasTenantPermission(
	membership: TenantMembershipContext | null,
	permission: TenantPermission
) {
	return getMembershipPermissions(membership).includes(permission);
}

export function canManageMembers(membership: TenantMembershipContext | null) {
	return hasTenantPermission(membership, "manage_members");
}

export function canAccessTimeline(membership: TenantMembershipContext | null) {
	return hasTenantPermission(membership, "view_timeline");
}

export function canAccessPortal(membership: TenantMembershipContext | null) {
	return getMembershipPermissions(membership).some((permission) =>
		PORTAL_BASE_PERMISSIONS.has(permission)
	);
}

export function resolveUnauthorizedDestination(scope: string) {
	return `/unauthorized?scope=${encodeURIComponent(scope)}`;
}

export function resolveTenantDestination(membership: TenantMembershipContext | null) {
	if (!membership) return resolveUnauthorizedDestination("account_access");

	if (ACTIVE_PORTAL_TENANT_STATUSES.has(membership.tenant.status)) {
		if (canAccessPortal(membership)) {
			return "/portal";
		}
		if (canManageMembers(membership)) {
			return "/account/users";
		}
		return resolveUnauthorizedDestination("portal");
	}

	if (canAccessTimeline(membership)) {
		return "/timeline";
	}

	if (canManageMembers(membership)) {
		return "/account/users";
	}

	return resolveUnauthorizedDestination("timeline");
}

async function buildUserContext(input: {
	userId: string;
	email: string;
}) {
	let profile = await getProfileById(input.userId);
	if (!profile) {
		profile = await ensureProfile({
			id: input.userId,
			email: input.email,
		});
	}

	const [staffMembership, rawTenantMemberships] = await Promise.all([
		getStaffMembershipByProfileId(input.userId),
		getTenantMembershipsByProfileId(input.userId),
	]);

	const tenantMemberships = rawTenantMemberships
		.map(normalizeMembership)
		.filter(Boolean) as TenantMembershipContext[];

	let activeTenantMembership = pickActiveMembership(
		tenantMemberships,
		profile?.last_active_tenant_id
	);

	if ((profile?.last_active_tenant_id ?? null) !== (activeTenantMembership?.tenant_id ?? null)) {
		await updateProfileLastActiveTenant({
			profileId: input.userId,
			tenantId: activeTenantMembership?.tenant_id ?? null,
		});
	}

	return {
		userId: input.userId,
		email: normalizeEmail(input.email),
		profile: {
			...(profile ?? {
				id: input.userId,
				email: normalizeEmail(input.email),
				display_name: null,
				phone: null,
				last_active_tenant_id: null,
			}),
			last_active_tenant_id: activeTenantMembership?.tenant_id ?? null,
		},
		staffMembership,
		tenantMemberships,
		activeTenantMembership,
		primaryTenantMembership: activeTenantMembership,
	} satisfies UserContext;
}

export async function reconcileUserContextByIdentity(input: {
	userId: string;
	email: string;
}) {
	const normalizedEmail = normalizeEmail(input.email);

	await ensureProfile({
		id: input.userId,
		email: normalizedEmail,
	});

	if (STAFF_BOOTSTRAP_EMAILS.has(normalizedEmail)) {
		await upsertStaffMembership({
			profileId: input.userId,
			role: "staff_admin",
		});
	}

	const invitations = await listPendingTenantInvitationsByEmail(normalizedEmail);
	const nowIso = new Date().toISOString();

	for (const invitation of invitations) {
		if (invitation.expires_at && new Date(invitation.expires_at).getTime() < Date.now()) {
			await updateTenantInvitation({
				invitationId: invitation.id,
				status: "expired",
			});
			continue;
		}

		const membership = await createTenantMembership({
			tenantId: invitation.tenant_id,
			profileId: input.userId,
			role: invitation.target_role,
			invitationStatus: "active",
			isActive: true,
		});

		await replaceTenantMembershipPermissions({
			membershipId: membership.id,
			permissions:
				invitation.target_role === "account_owner"
					? []
					: invitation.permission_snapshot ?? [],
		});

		await updateTenantInvitation({
			invitationId: invitation.id,
			status: "accepted",
			acceptedAt: nowIso,
			acceptedByProfileId: input.userId,
			revokedAt: null,
		});
	}

	return buildUserContext({
		userId: input.userId,
		email: normalizedEmail,
	});
}

export async function getCurrentUserContext(): Promise<UserContext | null> {
	const supabase = await createClient();
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error) {
		if (isExpectedUnauthenticatedError(error)) {
			return null;
		}

		throw new Error(error.message);
	}
	if (!user?.id || !user.email) return null;

	return buildUserContext({
		userId: user.id,
		email: user.email,
	});
}

export function isStaffContext(context: UserContext | null) {
	return Boolean(context?.staffMembership?.is_active);
}

export async function getUserContextByIdentity(input: {
	userId: string;
	email: string;
}) {
	return buildUserContext(input);
}

export function resolvePostLoginDestination(context: UserContext) {
	if (isStaffContext(context)) return "/admin";
	return resolveTenantDestination(context.activeTenantMembership);
}
