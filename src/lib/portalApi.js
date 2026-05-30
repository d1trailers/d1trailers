import { getCurrentUserContext } from "@/lib/server/services/access";

const ACTIVE_PORTAL_TENANT_STATUSES = new Set(["active", "past_due", "suspended"]);

export async function requirePortalApiSession() {
	const context = await getCurrentUserContext();
	const tenant = context?.primaryTenantMembership?.tenant;
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

	return {
		error: null,
		context,
	};
}
