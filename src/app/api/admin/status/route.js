import { requireAdminApiSession } from "@/lib/adminApi";

export async function POST() {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	return Response.json(
		{ error: "Direct operational status changes will return in the operations migration phase." },
		{ status: 501 },
	);
}
