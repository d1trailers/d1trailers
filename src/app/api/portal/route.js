import {
	getPortalDataByEmail,
	isPortalEligibleCustomerStatus,
} from "@/lib/airtable";
import jwt from "jsonwebtoken";

export async function GET(req) {
	const sessionToken = req.cookies.get("portal_session")?.value;

	if (!sessionToken) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (!process.env.NEXTAUTH_SECRET) {
		return Response.json({ error: "Server configuration error" }, { status: 500 });
	}

	try {
		const payload = jwt.verify(sessionToken, process.env.NEXTAUTH_SECRET);
		const email =
			typeof payload === "object" && payload?.email
				? String(payload.email).toLowerCase()
				: null;
		const tokenType =
			typeof payload === "object" && payload?.type ? payload.type : null;

		if (!email || tokenType !== "portal-session") {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		const portalData = await getPortalDataByEmail(email);
		if (!portalData?.customer) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		if (!isPortalEligibleCustomerStatus(portalData.customer.status)) {
			return Response.json({ error: "Portal access is not available" }, { status: 403 });
		}

		return Response.json(portalData);
	} catch {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}
}
