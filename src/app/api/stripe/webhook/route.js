import { applyStripeWebhookEvent } from "@/lib/airtable";
import { verifyStripeWebhookSignature } from "@/lib/stripe";

export async function POST(req) {
	let rawBody = "";
	try {
		rawBody = await req.text();
	} catch {
		return Response.json(
			{ error: "Unable to read Stripe webhook payload." },
			{ status: 400 }
		);
	}

	if (!rawBody.trim()) {
		return Response.json(
			{ error: "Stripe webhook payload is required." },
			{ status: 400 }
		);
	}

	const signatureHeader = req.headers.get("stripe-signature");
	const verification = verifyStripeWebhookSignature(rawBody, signatureHeader);
	if (verification.mode === "required" && !verification.verified) {
		return Response.json(
			{
				error: "Invalid Stripe webhook signature.",
				reason: verification.reason,
			},
			{ status: 400 }
		);
	}

	let eventPayload;
	try {
		eventPayload = JSON.parse(rawBody);
	} catch {
		return Response.json(
			{ error: "Stripe webhook payload must be valid JSON." },
			{ status: 400 }
		);
	}

	try {
		const result = await applyStripeWebhookEvent(eventPayload);
		return Response.json(
			{
				received: true,
				verification:
					verification.mode === "disabled"
						? "unverified"
						: verification.verified
							? "verified"
							: "unverified",
				result,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error("Failed to process Stripe webhook:", error);
		return Response.json(
			{ error: "Failed to process Stripe webhook." },
			{ status: 500 }
		);
	}
}
