import { requireAdminApiSession } from "@/lib/adminApi";
import { BillingOperationError } from "@/lib/server/services/billing";
import {
	deleteAdminRentalRecord,
	getAdminRentalDetail,
	RentalOperationError,
	updateAdminRentalRecord,
} from "@/lib/server/services/rentals";

export async function GET(_request, { params }) {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	const resolvedParams = await params;
	const rentalId = typeof resolvedParams?.rentalId === "string" ? resolvedParams.rentalId : "";

	if (!rentalId) {
		return Response.json({ error: "Rental ID is required." }, { status: 400 });
	}

	try {
		const detail = await getAdminRentalDetail(rentalId);
		return Response.json(detail, { status: 200 });
	} catch (error) {
		if (error instanceof RentalOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		console.error("Failed to load rental detail:", error);
		return Response.json({ error: "Failed to load rental detail." }, { status: 500 });
	}
}

export async function PATCH(request, { params }) {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	const resolvedParams = await params;
	const rentalId = typeof resolvedParams?.rentalId === "string" ? resolvedParams.rentalId : "";

	if (!rentalId) {
		return Response.json({ error: "Rental ID is required." }, { status: 400 });
	}

	try {
		const body = await request.json();
		const rental = await updateAdminRentalRecord(rentalId, body);
		return Response.json({ rental }, { status: 200 });
	} catch (error) {
		if (error instanceof BillingOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		if (error instanceof RentalOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		if (error instanceof Error) {
			return Response.json({ error: error.message }, { status: 400 });
		}

		console.error("Failed to update rental:", error);
		return Response.json({ error: "Failed to update rental." }, { status: 500 });
	}
}

export async function DELETE(_request, { params }) {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	const resolvedParams = await params;
	const rentalId = typeof resolvedParams?.rentalId === "string" ? resolvedParams.rentalId : "";

	if (!rentalId) {
		return Response.json({ error: "Rental ID is required." }, { status: 400 });
	}

	try {
		await deleteAdminRentalRecord(rentalId);
		return Response.json({ success: true }, { status: 200 });
	} catch (error) {
		if (error instanceof RentalOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		console.error("Failed to delete rental:", error);
		return Response.json({ error: "Failed to delete rental." }, { status: 500 });
	}
}
