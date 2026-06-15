import {
	accountSwitchSchema,
	CORE_ACCOUNT_USER_PERMISSIONS,
	invitationCreateSchema,
	invitationUpdateSchema,
	memberUpdateSchema,
	type TenantPermission,
	type TenantRole,
} from "@/lib/contracts/account";
import { buildPortalAccessEmail } from "@/lib/email/templates";
import {
	canManageMembers,
	getMembershipPermissions,
	resolveTenantDestination,
	type TenantMembershipContext,
	type UserContext,
} from "@/lib/server/services/access";
import { sendTransactionalEmail } from "@/lib/server/services/communications";
import {
	countActiveOwnersForTenant,
	createTenantInvitation,
	getTenantInvitationById,
	getTenantMembershipById,
	listTenantInvitationsByTenantId,
	listTenantMembersByTenantId,
	replaceTenantMembershipPermissions,
	updateProfileLastActiveTenant,
	updateTenantInvitation,
	updateTenantMembership,
	type TenantInvitationRecord,
} from "@/lib/server/repos/platform";

class AccountAccessError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = "AccountAccessError";
		this.status = status;
	}
}

const CORE_ACCOUNT_USER_PERMISSION_SET = new Set<TenantPermission>(
	CORE_ACCOUNT_USER_PERMISSIONS
);

function dedupePermissions(permissions: TenantPermission[]) {
	return [...new Set(permissions)];
}

function buildInvitationExpiry() {
	return new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
}

function getManagerMembershipOrThrow(context: UserContext) {
	const membership = context.activeTenantMembership;

	if (!membership) {
		throw new AccountAccessError(403, "No active tenant account is selected.");
	}

	if (!canManageMembers(membership)) {
		throw new AccountAccessError(403, "You do not have permission to manage this account.");
	}

	return membership;
}

function isOwner(membership: TenantMembershipContext | null) {
	return membership?.role === "account_owner";
}

function normalizeDelegatedPermissions(input: {
	role: TenantRole;
	permissions: TenantPermission[];
	actorMembership: TenantMembershipContext;
}) {
	if (input.role === "account_owner") {
		return [] as TenantPermission[];
	}

	let permissions = dedupePermissions(input.permissions).filter((permission) =>
		CORE_ACCOUNT_USER_PERMISSION_SET.has(permission)
	);

	if (isOwner(input.actorMembership) && input.permissions.includes("manage_members")) {
		permissions = [...permissions, "manage_members"];
	}

	return permissions;
}

function mapMembershipForClient(
	membership: Awaited<ReturnType<typeof listTenantMembersByTenantId>>[number]
) {
	return {
		id: membership.id,
		profileId: membership.profile_id,
		email: membership.profile?.email ?? null,
		displayName: membership.profile?.display_name ?? null,
		role: membership.role,
		isActive: membership.is_active,
		invitationStatus: membership.invitation_status,
		permissions: Array.isArray(membership.permissions)
			? membership.permissions.map((permission) => permission.permission)
			: [],
	};
}

function mapInvitationForClient(invitation: TenantInvitationRecord) {
	return {
		id: invitation.id,
		tenantId: invitation.tenant_id,
		invitedEmail: invitation.invited_email,
		targetRole: invitation.target_role,
		permissionSnapshot: invitation.permission_snapshot ?? [],
		status: invitation.status,
		expiresAt: invitation.expires_at,
		acceptedAt: invitation.accepted_at,
		revokedAt: invitation.revoked_at,
		invitedBy:
			invitation.invited_by_profile?.display_name ??
			invitation.invited_by_profile?.email ??
			null,
	};
}

async function sendInvitationCommunication(input: {
	invitation: TenantInvitationRecord;
	tenantName: string;
	recipientEmail: string;
	inviterName: string | null;
}) {
	const roleLabel =
		input.invitation.target_role === "account_owner" ? "Account Owner" : "Account User";
	const email = buildPortalAccessEmail({
		tenantName: input.tenantName,
		inviterName: input.inviterName,
		roleLabel,
	});

	await sendTransactionalEmail({
		type: "portal_access",
		recipientEmail: input.recipientEmail,
		tenantId: input.invitation.tenant_id,
		subject: email.subject,
		html: email.html,
		text: email.text,
		payloadSnapshot: {
			invitationId: input.invitation.id,
			targetRole: input.invitation.target_role,
			permissionSnapshot: input.invitation.permission_snapshot ?? [],
		},
	});
}

export function buildAccountContextPayload(context: UserContext) {
	return {
		email: context.email,
		isStaff: Boolean(context.staffMembership?.is_active),
		activeTenantId: context.activeTenantMembership?.tenant_id ?? null,
		activeTenant: context.activeTenantMembership
			? {
					id: context.activeTenantMembership.tenant.id,
					name: context.activeTenantMembership.tenant.display_name,
					status: context.activeTenantMembership.tenant.status,
					role: context.activeTenantMembership.role,
					permissions: getMembershipPermissions(context.activeTenantMembership),
					canManageMembers: canManageMembers(context.activeTenantMembership),
			  }
			: null,
		memberships: context.tenantMemberships.map((membership) => ({
			id: membership.id,
			tenantId: membership.tenant_id,
			tenantName: membership.tenant.display_name,
			tenantStatus: membership.tenant.status,
			role: membership.role,
			permissions: getMembershipPermissions(membership),
			isActive: membership.is_active,
			destination: resolveTenantDestination(membership),
			canManageMembers: canManageMembers(membership),
		})),
	};
}

export async function switchActiveTenant(context: UserContext, rawInput: unknown) {
	const input = accountSwitchSchema.parse(rawInput);
	const membership = context.tenantMemberships.find(
		(candidate) => candidate.tenant_id === input.tenantId
	);

	if (!membership) {
		throw new AccountAccessError(403, "You do not have access to that account.");
	}

	await updateProfileLastActiveTenant({
		profileId: context.userId,
		tenantId: membership.tenant_id,
	});

	return {
		tenantId: membership.tenant_id,
		destination: resolveTenantDestination(membership),
	};
}

export async function listAccountMembers(context: UserContext) {
	const actorMembership = getManagerMembershipOrThrow(context);
	const [members, invitations] = await Promise.all([
		listTenantMembersByTenantId(actorMembership.tenant_id),
		listTenantInvitationsByTenantId(actorMembership.tenant_id),
	]);

	return {
		actorProfileId: context.userId,
		actorEmail: context.email,
		activeTenant: {
			id: actorMembership.tenant.id,
			name: actorMembership.tenant.display_name,
			status: actorMembership.tenant.status,
			role: actorMembership.role,
			permissions: getMembershipPermissions(actorMembership),
		},
		members: members.map(mapMembershipForClient),
		invitations: invitations
			.filter((invitation) => invitation.status === "pending")
			.map(mapInvitationForClient),
	};
}

export async function inviteTenantMember(context: UserContext, rawInput: unknown) {
	const actorMembership = getManagerMembershipOrThrow(context);
	const input = invitationCreateSchema.parse(rawInput);

	if (!isOwner(actorMembership) && input.role !== "account_user") {
		throw new AccountAccessError(
			403,
			"Delegated managers can only invite account users."
		);
	}

	const permissions = normalizeDelegatedPermissions({
		role: input.role,
		permissions: input.permissions,
		actorMembership,
	});

	const existingMembers = await listTenantMembersByTenantId(actorMembership.tenant_id);
	const normalizedEmail = input.email.trim().toLowerCase();
	const activeMember = existingMembers.find(
		(member) => member.is_active && member.profile?.email?.toLowerCase() === normalizedEmail
	);

	if (activeMember) {
		throw new AccountAccessError(409, "That email already has access to this account.");
	}

	const invitation = await createTenantInvitation({
		tenantId: actorMembership.tenant_id,
		invitedEmail: normalizedEmail,
		invitedByProfileId: context.userId,
		targetRole: input.role,
		permissionSnapshot: permissions,
		expiresAt: buildInvitationExpiry(),
	});

	await sendInvitationCommunication({
		invitation,
		tenantName: actorMembership.tenant.display_name,
		recipientEmail: normalizedEmail,
		inviterName: context.profile?.display_name ?? context.email,
	});

	return mapInvitationForClient(invitation);
}

export async function updateTenantMemberAccess(
	context: UserContext,
	membershipId: string,
	rawInput: unknown
) {
	const actorMembership = getManagerMembershipOrThrow(context);
	const input = memberUpdateSchema.parse(rawInput);
	const targetMembership = await getTenantMembershipById(membershipId);

	if (!targetMembership || targetMembership.tenant_id !== actorMembership.tenant_id) {
		throw new AccountAccessError(404, "Tenant member not found.");
	}

	if (targetMembership.profile_id === context.userId) {
		throw new AccountAccessError(400, "Use another account owner to modify your own access.");
	}

	if (!isOwner(actorMembership) && targetMembership.role === "account_owner") {
		throw new AccountAccessError(
			403,
			"Delegated managers cannot modify account owners."
		);
	}

	if (
		!isOwner(actorMembership) &&
		getMembershipPermissions(targetMembership.tenant ? (targetMembership as TenantMembershipContext) : null).includes(
			"manage_members"
		)
	) {
		throw new AccountAccessError(
			403,
			"Delegated managers cannot modify other member-managers."
		);
	}

	if (!isOwner(actorMembership) && input.role === "account_owner") {
		throw new AccountAccessError(
			403,
			"Delegated managers cannot promote members to account owner."
		);
	}

	const nextRole = input.role ?? targetMembership.role;
	const nextIsActive = input.isActive ?? targetMembership.is_active;

	if (
		targetMembership.role === "account_owner" &&
		(nextRole !== "account_owner" || nextIsActive === false)
	) {
		const activeOwnerCount = await countActiveOwnersForTenant(actorMembership.tenant_id);
		if (activeOwnerCount <= 1) {
			throw new AccountAccessError(
				400,
				"At least one active account owner must remain on the account."
			);
		}
	}

	const currentPermissions = getMembershipPermissions(
		targetMembership.tenant ? (targetMembership as TenantMembershipContext) : null
	);
	const nextPermissions = normalizeDelegatedPermissions({
		role: nextRole,
		permissions: input.permissions ?? currentPermissions,
		actorMembership,
	});

	const updatedMembership = await updateTenantMembership({
		membershipId,
		role: input.role,
		isActive: input.isActive,
		invitationStatus: nextIsActive ? "active" : "revoked",
	});

	await replaceTenantMembershipPermissions({
		membershipId,
		permissions: nextPermissions,
	});

	const refreshedMembership = await getTenantMembershipById(updatedMembership.id);
	if (!refreshedMembership) {
		throw new AccountAccessError(500, "Member updated but could not be reloaded.");
	}

	const [members] = await Promise.all([listTenantMembersByTenantId(actorMembership.tenant_id)]);
	const fullMember = members.find((member) => member.id === refreshedMembership.id);

	return fullMember ? mapMembershipForClient(fullMember) : mapMembershipForClient({
		...refreshedMembership,
		profile: null,
	});
}

export async function updateInvitationState(
	context: UserContext,
	invitationId: string,
	rawInput: unknown
) {
	const actorMembership = getManagerMembershipOrThrow(context);
	const input = invitationUpdateSchema.parse(rawInput);
	const invitation = await getTenantInvitationById(invitationId);

	if (!invitation || invitation.tenant_id !== actorMembership.tenant_id) {
		throw new AccountAccessError(404, "Invitation not found.");
	}

	if (!isOwner(actorMembership) && invitation.target_role === "account_owner") {
		throw new AccountAccessError(
			403,
			"Delegated managers cannot modify owner invitations."
		);
	}

	if (
		!isOwner(actorMembership) &&
		(invitation.permission_snapshot ?? []).includes("manage_members")
	) {
		throw new AccountAccessError(
			403,
			"Delegated managers cannot modify manager-level invitations."
		);
	}

	if (input.action === "revoke") {
		const updated = await updateTenantInvitation({
			invitationId,
			status: "revoked",
			revokedAt: new Date().toISOString(),
		});
		return mapInvitationForClient(updated);
	}

	const updated = await updateTenantInvitation({
		invitationId,
		status: "pending",
		expiresAt: buildInvitationExpiry(),
		revokedAt: null,
	});

	await sendInvitationCommunication({
		invitation: updated,
		tenantName: actorMembership.tenant.display_name,
		recipientEmail: updated.invited_email,
		inviterName: context.profile?.display_name ?? context.email,
	});

	return mapInvitationForClient(updated);
}

export async function ensureOwnerInvitationForTenant(input: {
	tenantId: string;
	primaryEmail: string;
}) {
	const normalizedEmail = input.primaryEmail.trim().toLowerCase();
	const [members, invitations] = await Promise.all([
		listTenantMembersByTenantId(input.tenantId),
		listTenantInvitationsByTenantId(input.tenantId),
	]);

	const hasActiveOwner = members.some(
		(member) =>
			member.is_active &&
			member.role === "account_owner" &&
			member.profile?.email?.toLowerCase() === normalizedEmail
	);

	if (hasActiveOwner) {
		return null;
	}

	const existingPendingInvitation = invitations.find(
		(invitation) =>
			invitation.status === "pending" &&
			invitation.target_role === "account_owner" &&
			invitation.invited_email.toLowerCase() === normalizedEmail
	);

	if (existingPendingInvitation) {
		return existingPendingInvitation;
	}

	return createTenantInvitation({
		tenantId: input.tenantId,
		invitedEmail: normalizedEmail,
		targetRole: "account_owner",
		permissionSnapshot: [],
		expiresAt: buildInvitationExpiry(),
	});
}

export { AccountAccessError };
