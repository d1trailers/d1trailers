import { requireAuthenticatedAccountContext } from "@/lib/accountApi";
import {
	RentalOperationError,
	submitAccountRentalModification,
} from "@/lib/server/services/rentals";

export async function PATCH(request, { params }) {
	const auth = await requireAuthenticatedAccountContext();
	if (auth.error) return auth.error;

	const resolvedParams = await params;
	const rentalId =
		typeof resolvedParams?.rentalId === "string" ? resolvedParams.rentalId : "";

	if (!rentalId) {
		return Response.json({ error: "Rental ID is required." }, { status: 400 });
	}

	try {
		const body = await request.json();
		if (body?.action === "approve_draft") {
			return Response.json(
				{ error: "Use the signing workflow to approve this proposal." },
				{ status: 409 }
			);
		}
		const rental = await submitAccountRentalModification(
			auth.context,
			rentalId,
			body
		);
		return Response.json({ rental }, { status: 200 });
	} catch (error) {
		if (error instanceof RentalOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		if (error instanceof Error) {
			return Response.json({ error: error.message }, { status: 400 });
		}

		console.error("Failed to submit rental modification:", error);
		return Response.json(
			{ error: "Failed to submit rental modification." },
			{ status: 500 }
		);
	}
}
