import {
	enforceRateLimits,
	getClientIp,
	RateLimitError,
} from "@/lib/server/security/rateLimit";
import { submitInterest } from "@/lib/server/services/interest";

function getErrorStatus(error: unknown) {
	const message =
		error instanceof Error ? error.message.toLowerCase() : "unknown error";

	if (
		message.includes("valid") ||
		message.includes("required") ||
		message.includes("phone")
	) {
		return 400;
	}

	return 500;
}

export async function POST(request: Request) {
	try {
		await enforceRateLimits([
			{
				name: "interest:ip",
				identifier: getClientIp(request),
				windowSeconds: 60 * 60,
				max: 10,
			},
		]);
		const body = await request.json();
		await submitInterest(body);

		return Response.json(
			{
				message:
					"Thanks for reaching out. Our team received your request and will review it shortly.",
			},
			{ status: 201 }
		);
	} catch (error) {
		if (error instanceof RateLimitError) {
			return Response.json({ error: error.message }, { status: 429 });
		}

		console.error("Failed to submit interest request:", error);
		const status = getErrorStatus(error);
		return Response.json(
			{
				error:
					status === 400 && error instanceof Error
						? error.message
						: "We couldn't send your request. Please try again shortly.",
			},
			{ status }
		);
	}
}
