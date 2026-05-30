import { requirePortalApiSession } from "@/lib/portalApi";
import { getPortalSnapshot } from "@/lib/server/services/dashboard";

export async function GET() {
	const auth = await requirePortalApiSession();
	if (auth.error) return auth.error;

	try {
		const portalData = await getPortalSnapshot(auth.context);
		return Response.json(portalData);
	} catch (error) {
		console.error("Failed to load portal data:", error);
		return Response.json({ error: "Failed to load portal data" }, { status: 500 });
	}
}
