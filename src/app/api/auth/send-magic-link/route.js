export async function POST(req) {
	const { email } = await req.json();
	console.log("Received email:", email);

	return new Response(JSON.stringify({ message: "TEST link sent" }), {
		status: 200,
	});
}
