import { requireAdminApiSession } from "@/lib/adminApi";
import {
	activateRentalBilling,
	BillingOperationError,
} from "@/lib/server/services/billing";

export async function POST(_request, { params }) {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	const resolvedParams = await params;
	const rentalId =
		typeof resolvedParams?.rentalId === "string" ? resolvedParams.rentalId : "";

	if (!rentalId) {
		return Response.json({ error: "Rental ID is required." }, { status: 400 });
	}

	try {
		const link = await activateRentalBilling(rentalId);
		return Response.json(link, { status: 200 });
	} catch (error) {
		if (error instanceof BillingOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		if (error instanceof Error) {
			return Response.json({ error: error.message }, { status: 400 });
		}

		console.error("Failed to generate payment link:", error);
		return Response.json(
			{ error: "Failed to generate payment link." },
			{ status: 500 },
		);
	}
}
