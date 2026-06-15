import { requireAdminApiSession } from "@/lib/adminApi";
import { publishManualRentalTimelineUpdate } from "@/lib/server/services/journey";

export async function POST(req, { params }) {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	const resolvedParams = await params;
	const rentalId =
		typeof resolvedParams?.rentalId === "string" ? resolvedParams.rentalId : "";

	if (!rentalId) {
		return Response.json({ error: "Rental ID is required." }, { status: 400 });
	}

	let body = {};
	try {
		body = await req.json();
	} catch {
		body = {};
	}

	try {
		const timelineItem = await publishManualRentalTimelineUpdate({
			rentalId,
			rawInput: body,
			actorContext: auth.context,
		});

		return Response.json(timelineItem, { status: 200 });
	} catch (error) {
		console.error("Failed to publish rental timeline update:", error);
		return Response.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to publish rental timeline update.",
			},
			{ status: 400 }
		);
	}
}
