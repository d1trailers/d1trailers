import { requireAuthenticatedAccountContext } from "@/lib/accountApi";
import {
	listAccountRentals,
	RentalOperationError,
} from "@/lib/server/services/rentals";

export async function GET() {
	const auth = await requireAuthenticatedAccountContext();
	if (auth.error) return auth.error;

	try {
		const result = await listAccountRentals(auth.context);
		return Response.json(result, { status: 200 });
	} catch (error) {
		if (error instanceof RentalOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		console.error("Failed to load account rentals:", error);
		return Response.json({ error: "Failed to load rentals." }, { status: 500 });
	}
}
