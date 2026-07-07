import {
	BillingOperationError,
	processStripeWebhook,
} from "@/lib/server/services/billing";

export async function POST(request) {
	try {
		const rawBody = await request.text();
		const signature = request.headers.get("stripe-signature");
		const result = await processStripeWebhook({ rawBody, signature });
		return Response.json(result, { status: 200 });
	} catch (error) {
		if (error instanceof BillingOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		if (error instanceof Error) {
			console.error("Stripe webhook failed:", error.message);
			return Response.json({ error: error.message }, { status: 400 });
		}

		console.error("Stripe webhook failed:", error);
		return Response.json({ error: "Stripe webhook failed." }, { status: 500 });
	}
}
