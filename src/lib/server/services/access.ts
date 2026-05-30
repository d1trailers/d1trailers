import { createClient } from "@/lib/supabase/server";
import { getStaffBootstrapEmails } from "@/lib/server/env";
import {
	ensureProfile,
	getProfileById,
	getStaffMembershipByProfileId,
	getTenantByPrimaryEmail,
	getTenantMembershipsByProfileId,
	createTenantMembership,
	upsertStaffMembership,
	type StaffMembershipRecord,
	type TenantMembershipRecord,
	type ProfileRecord,
} from "@/lib/server/repos/platform";

export type UserContext = {
	userId: string;
	email: string;
	profile: ProfileRecord | null;
	staffMembership: StaffMembershipRecord | null;
	tenantMemberships: TenantMembershipRecord[];
	primaryTenantMembership: TenantMembershipRecord | null;
};

const ACTIVE_PORTAL_TENANT_STATUSES = new Set(["active", "past_due", "suspended"]);
const STAFF_BOOTSTRAP_EMAILS = new Set(getStaffBootstrapEmails());

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

async function ensureBootstrapAssociations(input: {
	userId: string;
	email: string;
	profile: ProfileRecord | null;
	staffMembership: StaffMembershipRecord | null;
	tenantMemberships: TenantMembershipRecord[];
}) {
	const ensuredProfile =
		input.profile ??
		(await ensureProfile({
			id: input.userId,
			email: input.email,
		}));

	let createdSomething = !input.profile;

	if (!input.staffMembership && STAFF_BOOTSTRAP_EMAILS.has(input.email.toLowerCase())) {
		await upsertStaffMembership({
			profileId: input.userId,
			role: "staff_admin",
		});
		createdSomething = true;
	}

	const tenant = await getTenantByPrimaryEmail(input.email);
	const hasTenantMembership = input.tenantMemberships.some(
		(membership) => membership.tenant_id === tenant?.id
	);

	if (tenant && !hasTenantMembership) {
		await createTenantMembership({
			tenantId: tenant.id,
			profileId: input.userId,
			role: "account_owner",
			invitationStatus: "active",
		});
		createdSomething = true;
	}

	return {
		profile: ensuredProfile,
		createdSomething,
	};
}

async function buildUserContext(input: {
	userId: string;
	email: string;
}): Promise<UserContext> {
	let [profile, staffMembership, tenantMemberships] = await Promise.all([
		getProfileById(input.userId),
		getStaffMembershipByProfileId(input.userId),
		getTenantMembershipsByProfileId(input.userId),
	]);

	const bootstrap = await ensureBootstrapAssociations({
		userId: input.userId,
		email: input.email,
		profile,
		staffMembership,
		tenantMemberships,
	});

	profile = bootstrap.profile;

	if (bootstrap.createdSomething) {
		[staffMembership, tenantMemberships] = await Promise.all([
			getStaffMembershipByProfileId(input.userId),
			getTenantMembershipsByProfileId(input.userId),
		]);
	}

	return {
		userId: input.userId,
		email: input.email.toLowerCase(),
		profile,
		staffMembership,
		tenantMemberships,
		primaryTenantMembership:
			tenantMemberships.find((membership) => membership.role === "account_owner") ??
			tenantMemberships[0] ??
			null,
	};
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

	const status = context.primaryTenantMembership?.tenant?.status;
	if (status && ACTIVE_PORTAL_TENANT_STATUSES.has(status)) {
		return "/portal";
	}

	if (context.primaryTenantMembership) {
		return "/timeline";
	}

	return "/login";
}
