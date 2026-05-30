import { requestLoginLink } from "@/lib/server/services/auth";

function getErrorStatus(error: unknown) {
	const message =
		error instanceof Error ? error.message.toLowerCase() : "unknown error";

	if (message.includes("email")) {
		return 400;
	}

	return 500;
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		await requestLoginLink(body?.email);

		return Response.json(
			{
				message:
					"If this email is recognized in the system, a secure login link has been generated.",
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error("Failed to request login link:", error);
		return Response.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to request login link.",
			},
			{ status: getErrorStatus(error) }
		);
	}
}
