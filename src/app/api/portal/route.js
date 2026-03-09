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

	let email = null;
	try {
		const payload = jwt.verify(sessionToken, process.env.NEXTAUTH_SECRET);
		email =
			typeof payload === "object" && payload?.email
				? String(payload.email).toLowerCase()
				: null;
		const tokenType =
			typeof payload === "object" && payload?.type ? payload.type : null;
		if (!email || tokenType !== "portal-session") {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}
	} catch {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

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
