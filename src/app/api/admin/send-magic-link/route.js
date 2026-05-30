export async function POST() {
	return Response.json(
		{ error: "Legacy admin magic-link endpoints are retired. Use the Supabase login flow at /login." },
		{ status: 410 },
	);
}
