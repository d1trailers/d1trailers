import { requireAuthenticatedAccountContext } from "@/lib/accountApi";
import {
	removeAccountRentalAssignment,
	RentalOperationError,
} from "@/lib/server/services/rentals";

export async function DELETE(_request, { params }) {
	const auth = await requireAuthenticatedAccountContext();
	if (auth.error) return auth.error;

	const resolvedParams = await params;
	const rentalId = typeof resolvedParams?.rentalId === "string" ? resolvedParams.rentalId : "";
	const assignmentId =
		typeof resolvedParams?.assignmentId === "string" ? resolvedParams.assignmentId : "";

	if (!rentalId || !assignmentId) {
		return Response.json(
			{ error: "Rental ID and assignment ID are required." },
			{ status: 400 }
		);
	}

	try {
		const rental = await removeAccountRentalAssignment(
			auth.context,
			rentalId,
			assignmentId
		);
		return Response.json({ rental }, { status: 200 });
	} catch (error) {
		if (error instanceof RentalOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		console.error("Failed to remove account rental assignment:", error);
		return Response.json(
			{ error: "Failed to remove rental assignment." },
			{ status: 500 }
		);
	}
}
