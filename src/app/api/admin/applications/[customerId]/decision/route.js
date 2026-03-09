import {
	applyAdminApplicationDecision,
	ApplicationDecisionError,
} from "@/lib/airtable";
import { requireAdminApiSession } from "@/lib/adminApi";

function mapDecisionErrorToStatus(code) {
	if (code === "VALIDATION") return 400;
	if (code === "NOT_FOUND") return 404;
	if (code === "CONFLICT") return 409;
	return 500;
}

export async function POST(req, { params }) {
	const auth = requireAdminApiSession(req);
	if (auth.error) return auth.error;

	const routeParams = await params;
	const customerId =
		typeof routeParams?.customerId === "string"
			? routeParams.customerId.trim()
			: "";
	if (!customerId) {
		return Response.json({ error: "Customer ID is required" }, { status: 400 });
	}

	let body;
	try {
		body = await req.json();
	} catch {
		return Response.json({ error: "Invalid request body" }, { status: 400 });
	}

	try {
		const result = await applyAdminApplicationDecision(customerId, {
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

		console.error("Failed to apply admin application decision:", error);
		return Response.json(
			{ error: "Failed to apply application decision" },
			{ status: 500 }
		);
	}
}
