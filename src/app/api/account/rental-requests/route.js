import { requireAuthenticatedAccountContext } from "@/lib/accountApi";
import {
	createAccountRentalRequest,
	RentalOperationError,
} from "@/lib/server/services/rentals";

export async function POST(request) {
	const auth = await requireAuthenticatedAccountContext();
	if (auth.error) return auth.error;

	try {
		const body = await request.json();
		const rental = await createAccountRentalRequest(auth.context, body);
		return Response.json({ rental }, { status: 201 });
	} catch (error) {
		if (error instanceof RentalOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		if (error instanceof Error) {
			return Response.json({ error: error.message }, { status: 400 });
		}

		console.error("Failed to create rental request:", error);
		return Response.json({ error: "Failed to create rental request." }, { status: 500 });
	}
}
