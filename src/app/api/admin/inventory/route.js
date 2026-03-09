import { getAdminInventoryData } from "@/lib/airtable";
import { requireAdminApiSession } from "@/lib/adminApi";

export async function GET(req) {
	const auth = requireAdminApiSession(req);
	if (auth.error) return auth.error;

	try {
		const inventory = await getAdminInventoryData();
		return Response.json(inventory, { status: 200 });
	} catch (error) {
		console.error("Failed to load admin inventory:", error);
		return Response.json({ error: "Failed to load admin inventory" }, { status: 500 });
	}
}
