import { requireAdminApiSession } from "@/lib/adminApi";
import {
	createAdminTrailerRecord,
	listAdminTrailerRecords,
	RentalOperationError,
} from "@/lib/server/services/rentals";

export async function GET() {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	try {
		const trailers = await listAdminTrailerRecords();
		return Response.json(trailers, { status: 200 });
	} catch (error) {
		console.error("Failed to load admin trailers:", error);
		return Response.json({ error: "Failed to load trailers." }, { status: 500 });
	}
}

export async function POST(request) {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	try {
		const body = await request.json();
		const trailer = await createAdminTrailerRecord(body);
		return Response.json({ trailer }, { status: 201 });
	} catch (error) {
		if (error instanceof RentalOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		if (error instanceof Error) {
			return Response.json({ error: error.message }, { status: 400 });
		}

		console.error("Failed to create trailer:", error);
		return Response.json({ error: "Failed to create trailer." }, { status: 500 });
	}
}
