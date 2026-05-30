export async function POST() {
	return Response.json(
		{ received: true, message: "Stripe webhook handling will be reconnected once the live billing phase resumes." },
		{ status: 202 },
	);
}
