import { requireAdminApiSession } from "@/lib/adminApi";
import { reviewApplication } from "@/lib/server/services/applications";

const ACTION_MAP = {
	review: "under_review",
	request_info: "feedback_requested",
	approve: "approved",
	deny: "closed",
};

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

	const nextAction =
		typeof body?.action === "string" ? ACTION_MAP[body.action] : undefined;

	if (!nextAction) {
		return Response.json({ error: "A valid application action is required." }, { status: 400 });
	}

	try {
		const application = await reviewApplication({
			applicationId,
			action: nextAction,
			reviewNotes:
				typeof body?.reviewNotes === "string" ? body.reviewNotes.trim() : "",
			actorContext: auth.context,
		});

		return Response.json(application, { status: 200 });
	} catch (error) {
		console.error("Failed to apply admin application decision:", error);
		return Response.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to apply application review action.",
			},
			{ status: 500 }
		);
	}
}
