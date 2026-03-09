import { getAdminApplicationsData } from "@/lib/airtable";
import { requireAdminApiSession } from "@/lib/adminApi";

export async function GET(req) {
	const auth = requireAdminApiSession(req);
	if (auth.error) return auth.error;

	try {
		const applications = await getAdminApplicationsData();
		return Response.json(applications, { status: 200 });
	} catch (error) {
		console.error("Failed to load admin applications:", error);
		return Response.json(
			{ error: "Failed to load admin applications" },
			{ status: 500 }
		);
	}
}
