import { ZodError } from "zod";
import { getClientIp, RateLimitError } from "@/lib/server/security/rateLimit";
import { requestLoginLink } from "@/lib/server/services/auth";

const GENERIC_SUCCESS_MESSAGE =
	"If this email is recognized, a secure sign-in link is on its way. Check your inbox.";

export async function POST(request: Request) {
	try {
		const body = await request.json().catch(() => ({}));
		await requestLoginLink(body?.email, { ip: getClientIp(request) });

		// Identical response for eligible and ineligible emails. The link itself is only
		// ever delivered by email.
		return Response.json({ message: GENERIC_SUCCESS_MESSAGE }, { status: 200 });
	} catch (error) {
		if (error instanceof ZodError) {
			return Response.json({ error: "Enter a valid email address." }, { status: 400 });
		}

		if (error instanceof RateLimitError) {
			return Response.json({ error: error.message }, { status: 429 });
		}

		console.error(
			"Failed to request login link:",
			error instanceof Error ? error.message : error
		);
		return Response.json(
			{ error: "We couldn't process that request. Please try again shortly." },
			{ status: 500 }
		);
	}
}
