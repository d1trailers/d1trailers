import { getAdminApplications } from "@/lib/server/services/dashboard";
import { requireAdminApiSession } from "@/lib/adminApi";

export async function GET() {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	try {
		const applications = await getAdminApplications();
		return Response.json(applications, { status: 200 });
	} catch (error) {
		console.error("Failed to load admin applications:", error);
		return Response.json(
			{ error: "Failed to load admin applications" },
			{ status: 500 }
		);
	}
}
