import {
	canAccessPortal,
	getCurrentUserContext,
	hasTenantPermission,
} from "@/lib/server/services/access";

const ACTIVE_PORTAL_TENANT_STATUSES = new Set(["active", "past_due", "suspended"]);

export async function requirePortalApiSession(requiredPermission = null) {
	const context = await getCurrentUserContext();
	const membership = context?.activeTenantMembership ?? null;
	const tenant = membership?.tenant;
	if (!tenant) {
		return {
			error: Response.json({ error: "Unauthorized" }, { status: 401 }),
			context: null,
		};
	}

	if (!ACTIVE_PORTAL_TENANT_STATUSES.has(tenant.status)) {
		return {
			error: Response.json(
				{ error: "Portal access is only available for active tenant accounts." },
				{ status: 403 }
			),
			context: null,
		};
	}

	if (!canAccessPortal(membership)) {
		return {
			error: Response.json(
				{ error: "You do not have permission to access this account portal." },
				{ status: 403 }
			),
			context: null,
		};
	}

	if (requiredPermission && !hasTenantPermission(membership, requiredPermission)) {
		return {
			error: Response.json(
				{ error: "You do not have permission to perform that account action." },
				{ status: 403 }
			),
			context: null,
		};
	}

	return {
		error: null,
		context,
	};
}
