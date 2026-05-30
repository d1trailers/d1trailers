import { submitApplication } from "@/lib/server/services/applications";

function getErrorStatus(error: unknown) {
	const message =
		error instanceof Error ? error.message.toLowerCase() : "unknown error";

	if (
		message.includes("required") ||
		message.includes("valid") ||
		message.includes("must be") ||
		message.includes("not found")
	) {
		return 400;
	}

	return 500;
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
				error:
					error instanceof Error
						? error.message
						: "Failed to submit application.",
			},
			{ status: getErrorStatus(error) }
		);
	}
}
