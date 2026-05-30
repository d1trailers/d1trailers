import { requirePortalApiSession } from "@/lib/portalApi";

export async function POST() {
	const auth = await requirePortalApiSession();
	if (auth.error) return auth.error;

	return Response.json(
		{ message: "Manage Billing is wired on the new platform, but live Stripe actions remain temporarily disabled." },
		{ status: 200 },
	);
}
