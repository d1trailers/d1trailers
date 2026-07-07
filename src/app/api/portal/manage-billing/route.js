import { requirePortalApiSession } from "@/lib/portalApi";
import {
	BillingOperationError,
	createBillingPortalSessionForTenant,
} from "@/lib/server/services/billing";

export async function POST() {
	const auth = await requirePortalApiSession("view_billing");
	if (auth.error) return auth.error;

	const tenantId = auth.context?.activeTenantMembership?.tenant_id;
	if (!tenantId) {
		return Response.json({ error: "Tenant account is required." }, { status: 401 });
	}

	try {
		const session = await createBillingPortalSessionForTenant(tenantId);
		return Response.json(session, { status: 200 });
	} catch (error) {
		if (error instanceof BillingOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		if (error instanceof Error) {
			return Response.json({ error: error.message }, { status: 400 });
		}

		console.error("Failed to create billing portal session:", error);
		return Response.json(
			{ error: "Failed to create billing portal session." },
			{ status: 500 },
		);
	}
}
