import { requireAdminApiSession } from "@/lib/adminApi";

export async function POST() {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	return Response.json(
		{ message: "Payment link generation is wired on the new platform, but live Stripe actions remain temporarily disabled." },
		{ status: 200 },
	);
}
