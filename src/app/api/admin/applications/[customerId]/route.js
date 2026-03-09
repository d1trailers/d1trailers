import { getAdminApplicationDetailsByCustomerId } from "@/lib/airtable";
import { requireAdminApiSession } from "@/lib/adminApi";

export async function GET(req, { params }) {
	const auth = requireAdminApiSession(req);
	if (auth.error) return auth.error;

	const customerId =
		typeof params?.customerId === "string" ? params.customerId.trim() : "";
	if (!customerId) {
		return Response.json({ error: "Customer ID is required" }, { status: 400 });
	}

	try {
		const details = await getAdminApplicationDetailsByCustomerId(customerId);
		if (!details) {
			return Response.json({ error: "Application not found" }, { status: 404 });
		}

		return Response.json(details, { status: 200 });
	} catch (error) {
		console.error("Failed to load admin application details:", error);
		return Response.json(
			{ error: "Failed to load admin application details" },
			{ status: 500 }
		);
	}
}
