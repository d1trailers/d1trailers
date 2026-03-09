import { getAdminSummaryData } from "@/lib/airtable";
import { requireAdminApiSession } from "@/lib/adminApi";

export async function GET(req) {
	const auth = requireAdminApiSession(req);
	if (auth.error) return auth.error;

	try {
		const summary = await getAdminSummaryData();
		return Response.json(summary, { status: 200 });
	} catch (error) {
		console.error("Failed to load admin summary:", error);
		return Response.json({ error: "Failed to load admin summary" }, { status: 500 });
	}
}
