import { requireAuthenticatedAccountContext } from "@/lib/accountApi";
import {
	RentalOperationError,
	uploadAccountRentalDocument,
} from "@/lib/server/services/rentals";

export async function POST(request, { params }) {
	const auth = await requireAuthenticatedAccountContext();
	if (auth.error) return auth.error;

	const resolvedParams = await params;
	const rentalId = typeof resolvedParams?.rentalId === "string" ? resolvedParams.rentalId : "";

	if (!rentalId) {
		return Response.json({ error: "Rental ID is required." }, { status: 400 });
	}

	try {
		const formData = await request.formData();
		const document = await uploadAccountRentalDocument(
			auth.context,
			rentalId,
			formData
		);
		return Response.json({ document }, { status: 201 });
	} catch (error) {
		if (error instanceof RentalOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		if (error instanceof Error) {
			return Response.json({ error: error.message }, { status: 400 });
		}

		console.error("Failed to upload account rental document:", error);
		return Response.json(
			{ error: "Failed to upload rental document." },
			{ status: 500 }
		);
	}
}
