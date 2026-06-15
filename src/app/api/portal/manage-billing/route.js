import { requirePortalApiSession } from "@/lib/portalApi";

export async function POST() {
	const auth = await requirePortalApiSession("view_billing");
	if (auth.error) return auth.error;

	return Response.json(
		{ message: "Billing management is unavailable right now." },
		{ status: 200 },
	);
}
