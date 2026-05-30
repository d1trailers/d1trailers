import { getApplicationById } from "@/lib/server/repos/platform";
import { requireAdminApiSession } from "@/lib/adminApi";

export async function GET(_req, { params }) {
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

	try {
		const application = await getApplicationById(applicationId);
		if (!application) {
			return Response.json({ error: "Application not found." }, { status: 404 });
		}

		return Response.json(application, { status: 200 });
	} catch (error) {
		console.error("Failed to load admin application details:", error);
		return Response.json(
			{ error: "Failed to load admin application details" },
			{ status: 500 }
		);
	}
}
