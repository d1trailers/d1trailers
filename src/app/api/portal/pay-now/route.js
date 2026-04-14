import {
	getCustomerByPrimaryEmail,
	getRentalsByCustomer,
	isPortalEligibleCustomerStatus,
} from "@/lib/airtable";
import { requirePortalApiSession } from "@/lib/portalApi";
import { createOutstandingBalanceLink } from "@/lib/stripe";

const PAY_NOW_BILLING_STATUSES = new Set([
	"Awaiting First Payment",
	"Past Due",
	"Suspended",
	"Unpaid",
]);

function resolveAbsoluteUrl(req, path) {
	if (process.env.NEXTAUTH_URL) {
		return new URL(path, process.env.NEXTAUTH_URL).toString();
	}
	return new URL(path, req.url).toString();
}

export async function POST(req) {
	const auth = requirePortalApiSession(req);
	if (auth.error) return auth.error;

	let body = {};
	try {
		body = await req.json();
	} catch {
		body = {};
	}

	try {
		const customer = await getCustomerByPrimaryEmail(auth.email);
		if (!customer) {
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		if (!isPortalEligibleCustomerStatus(customer.status)) {
			return Response.json(
				{ error: "Portal billing actions are not available for this account." },
				{ status: 403 }
			);
		}

		const rentals = await getRentalsByCustomer(customer.recordId);
		const requestedRentalId =
			typeof body?.rentalId === "string" ? body.rentalId.trim() : "";

		const rental =
			rentals.find((entry) => entry.id === requestedRentalId) ||
			rentals.find(
				(entry) =>
					PAY_NOW_BILLING_STATUSES.has(entry.billingStatus) ||
					entry.status === "Overdue" ||
					entry.status === "Awaiting First Payment"
			) ||
			rentals[0];

		if (!rental) {
			return Response.json({ error: "No rental found for this account." }, { status: 404 });
		}

		const result = await createOutstandingBalanceLink({
			customer,
			rental,
			successUrl: resolveAbsoluteUrl(req, "/portal"),
			cancelUrl: resolveAbsoluteUrl(req, "/portal"),
		});

		return Response.json(
			{
				...result,
				message:
					result.disabledReason ||
					"Outstanding balance payment session created successfully.",
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error("Failed to create pay now session:", error);
		return Response.json(
			{ error: "Failed to start pay now flow." },
			{ status: 500 }
		);
	}
}
