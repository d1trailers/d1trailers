import { requireAdminApiSession } from "@/lib/adminApi";
import { publishManualApplicationTimelineUpdate } from "@/lib/server/services/journey";

export async function POST(req, { params }) {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	const resolvedParams = await params;
	const applicationId =
		typeof resolvedParams?.customerId === "string"
			? resolvedParams.customerId
			: "";

	if (!applicationId) {
		return Response.json({ error: "Application ID is required." }, { status: 400 });
	}

	let body = {};
	try {
		body = await req.json();
	} catch {
		body = {};
	}

	try {
		const timelineItem = await publishManualApplicationTimelineUpdate({
			applicationId,
			rawInput: body,
			actorContext: auth.context,
		});

		return Response.json(timelineItem, { status: 200 });
	} catch (error) {
		console.error("Failed to publish application timeline update:", error);
		return Response.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to publish application timeline update.",
			},
			{ status: 400 }
		);
	}
}
