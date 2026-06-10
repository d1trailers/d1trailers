import { requirePortalApiSession } from "@/lib/portalApi";

export async function POST() {
	const auth = await requirePortalApiSession("view_billing");
	if (auth.error) return auth.error;

	return Response.json(
		{ message: "Pay Now is wired on the new platform, but live Stripe actions remain temporarily disabled." },
		{ status: 200 },
	);
}
