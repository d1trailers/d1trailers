import {
	ApplicationDecisionError,
	updateAdminEntityStatus,
} from "@/lib/airtable";
import { requireAdminApiSession } from "@/lib/adminApi";

function mapDecisionErrorToStatus(code) {
	if (code === "VALIDATION") return 400;
	if (code === "NOT_FOUND") return 404;
	if (code === "CONFLICT") return 409;
	return 500;
}

export async function POST(req) {
	const auth = requireAdminApiSession(req);
	if (auth.error) return auth.error;

	let body;
	try {
		body = await req.json();
	} catch {
		return Response.json({ error: "Invalid request body" }, { status: 400 });
	}

	try {
		const result = await updateAdminEntityStatus({
			...body,
			decisionBy: auth.email,
		});
		return Response.json(result, { status: 200 });
	} catch (error) {
		if (error instanceof ApplicationDecisionError) {
			return Response.json(
				{ error: error.message },
				{ status: mapDecisionErrorToStatus(error.code) }
			);
		}

		console.error("Failed to update admin entity status:", error);
		return Response.json(
			{ error: "Failed to update admin entity status" },
			{ status: 500 }
		);
	}
}
