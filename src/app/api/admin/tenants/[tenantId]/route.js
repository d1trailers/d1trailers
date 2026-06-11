import { requireAdminApiSession } from "@/lib/adminApi";
import { getAdminTenantManagementDetail } from "@/lib/server/services/dashboard";

export async function GET(_req, { params }) {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	const resolvedParams = await params;
	const tenantId =
		typeof resolvedParams?.tenantId === "string" ? resolvedParams.tenantId : "";

	if (!tenantId) {
		return Response.json({ error: "Tenant ID is required." }, { status: 400 });
	}

	try {
		const detail = await getAdminTenantManagementDetail(tenantId);
		if (!detail) {
			return Response.json({ error: "Tenant not found." }, { status: 404 });
		}

		return Response.json(detail, { status: 200 });
	} catch (error) {
		console.error("Failed to load admin tenant detail:", error);
		return Response.json(
			{ error: "Failed to load admin tenant detail." },
			{ status: 500 },
		);
	}
}
