import {
	getPortalDataByEmail,
	isPortalEligibleCustomerStatus,
} from "@/lib/airtable";
import { requirePortalApiSession } from "@/lib/portalApi";

export async function GET(req) {
	const auth = requirePortalApiSession(req);
	if (auth.error) return auth.error;
	const email = auth.email;

	try {
		const portalData = await getPortalDataByEmail(email);
		if (!portalData?.customer) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		if (!isPortalEligibleCustomerStatus(portalData.customer.status)) {
			return Response.json({ error: "Portal access is not available" }, { status: 403 });
		}

		return Response.json(portalData);
	} catch (error) {
		console.error("Failed to load portal data:", error);
		return Response.json({ error: "Failed to load portal data" }, { status: 500 });
	}
}
