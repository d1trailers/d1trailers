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
		console.error("Failed to submit interest request:", error);
		return Response.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to submit interest request.",
			},
			{ status: getErrorStatus(error) }
		);
	}
}
