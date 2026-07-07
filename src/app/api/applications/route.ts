import { submitApplication } from "@/lib/server/services/applications";
import { ZodError } from "zod";

function getErrorStatus(error: unknown) {
	if (error instanceof ZodError) {
		return 400;
	}

	const message =
		error instanceof Error ? error.message.toLowerCase() : "unknown error";

	if (
		message.includes("required") ||
		message.includes("valid") ||
		message.includes("must be") ||
		message.includes("at least") ||
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

	return error instanceof Error ? error.message : "Failed to submit application.";
}

export async function POST(request: Request) {
	try {
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
		console.error("Failed to submit rental application:", error);
		return Response.json(
			{
				error: getErrorMessage(error),
			},
			{ status: getErrorStatus(error) }
		);
	}
}
