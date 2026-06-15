import { requireAdminApiSession } from "@/lib/adminApi";
import { listAdminTrailerRecords } from "@/lib/server/services/rentals";

export async function GET() {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	try {
		const trailers = await listAdminTrailerRecords();
		return Response.json(trailers, { status: 200 });
	} catch (error) {
		console.error("Failed to load inventory trailers:", error);
		return Response.json({ error: "Failed to load trailer inventory." }, { status: 500 });
	}
}
