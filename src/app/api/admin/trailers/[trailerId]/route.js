import { requireAdminApiSession } from "@/lib/adminApi";
import {
	getAdminTrailerDetail,
	RentalOperationError,
	updateAdminTrailerRecord,
} from "@/lib/server/services/rentals";

export async function GET(_request, { params }) {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	const resolvedParams = await params;
	const trailerId = typeof resolvedParams?.trailerId === "string" ? resolvedParams.trailerId : "";

	if (!trailerId) {
		return Response.json({ error: "Trailer ID is required." }, { status: 400 });
	}

	try {
		const detail = await getAdminTrailerDetail(trailerId);
		return Response.json(detail, { status: 200 });
	} catch (error) {
		if (error instanceof RentalOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		console.error("Failed to load trailer detail:", error);
		return Response.json({ error: "Failed to load trailer detail." }, { status: 500 });
	}
}

export async function PATCH(request, { params }) {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	const resolvedParams = await params;
	const trailerId = typeof resolvedParams?.trailerId === "string" ? resolvedParams.trailerId : "";

	if (!trailerId) {
		return Response.json({ error: "Trailer ID is required." }, { status: 400 });
	}

	try {
		const body = await request.json();
		const trailer = await updateAdminTrailerRecord(trailerId, body);
		return Response.json({ trailer }, { status: 200 });
	} catch (error) {
		if (error instanceof RentalOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		if (error instanceof Error) {
			return Response.json({ error: error.message }, { status: 400 });
		}

		console.error("Failed to update trailer:", error);
		return Response.json({ error: "Failed to update trailer." }, { status: 500 });
	}
}
