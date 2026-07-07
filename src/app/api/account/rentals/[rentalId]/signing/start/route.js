import { requireAuthenticatedAccountContext } from "@/lib/accountApi";
import {
	SigningOperationError,
	startRentalSigning,
} from "@/lib/server/services/signing";

export async function POST(_request, { params }) {
	const auth = await requireAuthenticatedAccountContext();
	if (auth.error) return auth.error;

	const resolvedParams = await params;
	const rentalId =
		typeof resolvedParams?.rentalId === "string" ? resolvedParams.rentalId : "";
	if (!rentalId) {
		return Response.json({ error: "Rental ID is required." }, { status: 400 });
	}

	try {
		const result = await startRentalSigning(auth.context, rentalId);
		return Response.json(result, { status: 200 });
	} catch (error) {
		if (error instanceof SigningOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}
		console.error("Failed to start rental signing:", error);
		return Response.json(
			{ error: error instanceof Error ? error.message : "Failed to start signing." },
			{ status: 500 }
		);
	}
}
