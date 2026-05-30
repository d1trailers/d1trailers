import { getAdminSummary } from "@/lib/server/services/dashboard";
import { requireAdminApiSession } from "@/lib/adminApi";

export async function GET() {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	try {
		const summary = await getAdminSummary();
		return Response.json(summary, { status: 200 });
	} catch (error) {
		console.error("Failed to load admin summary:", error);
		return Response.json({ error: "Failed to load admin summary" }, { status: 500 });
	}
}
