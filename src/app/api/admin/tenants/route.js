import { requireAdminApiSession } from "@/lib/adminApi";
import { getAdminManagementTenants } from "@/lib/server/services/dashboard";

export async function GET() {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	try {
		const tenants = await getAdminManagementTenants();
		return Response.json(tenants, { status: 200 });
	} catch (error) {
		console.error("Failed to load admin management tenants:", error);
		return Response.json(
			{ error: "Failed to load admin management tenants." },
			{ status: 500 },
		);
	}
}
