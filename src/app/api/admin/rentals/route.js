import { getAdminRentalsData } from "@/lib/airtable";
import { requireAdminApiSession } from "@/lib/adminApi";

export async function GET(req) {
	const auth = requireAdminApiSession(req);
	if (auth.error) return auth.error;

	try {
		const rentals = await getAdminRentalsData();
		return Response.json(rentals, { status: 200 });
	} catch (error) {
		console.error("Failed to load admin rentals:", error);
		return Response.json({ error: "Failed to load admin rentals" }, { status: 500 });
	}
}
