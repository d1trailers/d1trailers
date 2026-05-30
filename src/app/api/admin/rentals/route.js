import { requireAdminApiSession } from "@/lib/adminApi";

export async function GET() {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	return Response.json([], { status: 200 });
}
