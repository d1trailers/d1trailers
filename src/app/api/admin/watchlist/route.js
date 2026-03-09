import { getAdminWatchlistData } from "@/lib/airtable";
import { requireAdminApiSession } from "@/lib/adminApi";

export async function GET(req) {
	const auth = requireAdminApiSession(req);
	if (auth.error) return auth.error;

	try {
		const watchlist = await getAdminWatchlistData();
		return Response.json(watchlist, { status: 200 });
	} catch (error) {
		console.error("Failed to load admin watchlist:", error);
		return Response.json({ error: "Failed to load admin watchlist" }, { status: 500 });
	}
}
