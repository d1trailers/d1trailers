import { requireAdminApiSession } from "@/lib/adminApi";
import {
	createAdminRentalRecord,
	listAdminRentalRecords,
	RentalOperationError,
} from "@/lib/server/services/rentals";

export async function GET() {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	try {
		const rentals = await listAdminRentalRecords();
		return Response.json(rentals, { status: 200 });
	} catch (error) {
		console.error("Failed to load admin rentals:", error);
		return Response.json({ error: "Failed to load rentals." }, { status: 500 });
	}
}

export async function POST(request) {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	try {
		const body = await request.json();
		const rental = await createAdminRentalRecord(body);
		return Response.json({ rental }, { status: 201 });
	} catch (error) {
		if (error instanceof RentalOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		if (error instanceof Error) {
			return Response.json({ error: error.message }, { status: 400 });
		}

		console.error("Failed to create admin rental:", error);
		return Response.json({ error: "Failed to create rental." }, { status: 500 });
	}
}
