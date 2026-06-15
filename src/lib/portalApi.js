import {
	canAccessPortal,
	canAccessTimeline,
	getCurrentUserContext,
	hasTenantPermission,
} from "@/lib/server/services/access";

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

	if (!canAccessPortal(membership) && !canAccessTimeline(membership)) {
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
