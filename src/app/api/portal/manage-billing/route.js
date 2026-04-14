import {
	getCustomerByPrimaryEmail,
	isPortalEligibleCustomerStatus,
} from "@/lib/airtable";
import { requirePortalApiSession } from "@/lib/portalApi";
import { createBillingPortalLaunch } from "@/lib/stripe";

function resolveAbsoluteUrl(req, path) {
	if (process.env.NEXTAUTH_URL) {
		return new URL(path, process.env.NEXTAUTH_URL).toString();
	}
	return new URL(path, req.url).toString();
}

export async function POST(req) {
	const auth = requirePortalApiSession(req);
	if (auth.error) return auth.error;

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

		const result = await createBillingPortalLaunch({
			customer,
			returnUrl: resolveAbsoluteUrl(req, "/portal"),
		});

		return Response.json(
			{
				...result,
				message:
					result.disabledReason ||
					"Billing portal session created successfully.",
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error("Failed to create billing portal session:", error);
		return Response.json(
			{ error: "Failed to start manage billing flow." },
			{ status: 500 }
		);
	}
}
