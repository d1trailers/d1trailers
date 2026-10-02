import { submitApplication } from "@/lib/server/services/applications";
import {
	enforceRateLimits,
	getClientIp,
	RateLimitError,
} from "@/lib/server/security/rateLimit";
import { UploadValidationError } from "@/lib/server/uploads/validateUpload";
import { ZodError } from "zod";

function getErrorStatus(error: unknown) {
	if (error instanceof ZodError || error instanceof UploadValidationError) {
		return 400;
	}

	const message =
		error instanceof Error ? error.message.toLowerCase() : "unknown error";

	if (
		message.includes("required") ||
		message.includes("valid") ||
		message.includes("must be") ||
		message.includes("at least") ||
		message.includes("up to") ||
		message.includes("expected") ||
		message.includes("not found")
	) {
		return 400;
	}

	return 500;
}

function getErrorMessage(error: unknown) {
	if (error instanceof ZodError) {
		return error.issues[0]?.message || "Please check the application form.";
	}

	if (getErrorStatus(error) === 400 && error instanceof Error) {
		return error.message;
	}

	return "We couldn't submit your application. Please try again shortly.";
}

export async function POST(request: Request) {
	try {
		await enforceRateLimits([
			{
				name: "applications:ip",
				identifier: getClientIp(request),
				windowSeconds: 60 * 60,
				max: 5,
			},
		]);
		const formData = await request.formData();
		const result = await submitApplication(formData);

		return Response.json(
			{
				message: "Application submitted successfully.",
				...result,
			},
			{ status: 201 }
		);
	} catch (error) {
		if (error instanceof RateLimitError) {
			return Response.json({ error: error.message }, { status: 429 });
		}

		console.error("Failed to submit rental application:", error);
		return Response.json(
			{
				error: getErrorMessage(error),
			},
			{ status: getErrorStatus(error) }
		);
	}
}
