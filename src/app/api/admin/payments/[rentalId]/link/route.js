import { getCustomersByIds, getRentalsByIds } from "@/lib/airtable";
import { requireAdminApiSession } from "@/lib/adminApi";
import { createFirstPaymentLink } from "@/lib/stripe";

const PAYMENT_LINK_ELIGIBLE_RENTAL_STATUSES = new Set([
	"Awaiting First Payment",
	"Overdue",
]);

function resolveAbsoluteUrl(req, path) {
	if (process.env.NEXTAUTH_URL) {
		return new URL(path, process.env.NEXTAUTH_URL).toString();
	}
	return new URL(path, req.url).toString();
}

export async function POST(req, { params }) {
	const auth = requireAdminApiSession(req);
	if (auth.error) return auth.error;

	const routeParams = await params;
	const rentalRecordId =
		typeof routeParams?.rentalId === "string" ? routeParams.rentalId.trim() : "";
	if (!rentalRecordId) {
		return Response.json({ error: "Rental record ID is required." }, { status: 400 });
	}

	try {
		const [rental] = await getRentalsByIds([rentalRecordId]);
		if (!rental) {
			return Response.json({ error: "Rental not found." }, { status: 404 });
		}

		if (!PAYMENT_LINK_ELIGIBLE_RENTAL_STATUSES.has(rental.status)) {
			return Response.json(
				{
					error:
						"Payment links are only available for rentals awaiting first payment or overdue billing.",
				},
				{ status: 409 }
			);
		}

		const [customer] = await getCustomersByIds(rental.customerRecordIds);
		if (!customer) {
			return Response.json({ error: "Customer not found for rental." }, { status: 404 });
		}

		const result = await createFirstPaymentLink({
			customer,
			rental,
			successUrl: resolveAbsoluteUrl(req, "/login"),
			cancelUrl: resolveAbsoluteUrl(req, "/admin/rentals"),
		});

		return Response.json(
			{
				...result,
				message:
					result.disabledReason ||
					"Payment link generated successfully.",
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error("Failed to generate admin payment link:", error);
		return Response.json(
			{ error: "Failed to generate payment link." },
			{ status: 500 }
		);
	}
}
