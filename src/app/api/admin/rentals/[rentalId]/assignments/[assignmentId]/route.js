import { requireAdminApiSession } from "@/lib/adminApi";
import {
	removeAdminRentalAssignment,
	RentalOperationError,
} from "@/lib/server/services/rentals";

export async function DELETE(_request, { params }) {
	const auth = await requireAdminApiSession();
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
		const rental = await removeAdminRentalAssignment(rentalId, assignmentId);
		return Response.json({ rental }, { status: 200 });
	} catch (error) {
		if (error instanceof RentalOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		console.error("Failed to remove rental assignment:", error);
		return Response.json(
			{ error: "Failed to remove rental assignment." },
			{ status: 500 }
		);
	}
}
