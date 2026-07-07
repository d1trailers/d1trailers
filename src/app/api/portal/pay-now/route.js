import { requirePortalApiSession } from "@/lib/portalApi";
import {
	BillingOperationError,
	createPayNowLinkForRental,
} from "@/lib/server/services/billing";

export async function POST(request) {
	const auth = await requirePortalApiSession("view_billing");
	if (auth.error) return auth.error;

	const tenantId = auth.context?.activeTenantMembership?.tenant_id;
	if (!tenantId) {
		return Response.json({ error: "Tenant account is required." }, { status: 401 });
	}

	try {
		const body = await request.json().catch(() => ({}));
		const rentalId = typeof body?.rentalId === "string" ? body.rentalId : "";
		if (!rentalId) {
			return Response.json({ error: "Rental ID is required." }, { status: 400 });
		}

		const link = await createPayNowLinkForRental(rentalId, tenantId);
		return Response.json(link, { status: 200 });
	} catch (error) {
		if (error instanceof BillingOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		if (error instanceof Error) {
			return Response.json({ error: error.message }, { status: 400 });
		}

		console.error("Failed to create payment link:", error);
		return Response.json(
			{ error: "Failed to create payment link." },
			{ status: 500 },
		);
	}
}
