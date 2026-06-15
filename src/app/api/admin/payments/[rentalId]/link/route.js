import { requireAdminApiSession } from "@/lib/adminApi";

export async function POST() {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	return Response.json(
		{ message: "Payment links are unavailable right now." },
		{ status: 200 },
	);
}
