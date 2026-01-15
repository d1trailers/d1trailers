import { authOptions } from "../auth/[...nextauth]/route";
import { getServerSession } from "next-auth";

export async function POST(req) {
	const { email } = await req.json();

	if (!email)
		return new Response(JSON.stringify({ error: "Email required" }), {
			status: 400,
		});

	try {
		console.log("Pretend sending magic link to:", email);

		return new Response(
			JSON.stringify({ message: "Magic link sent (testing mode)" }),
			{ status: 200 }
		);
	} catch (err) {
		return new Response(
			JSON.stringify({ error: "Failed to send magic link" }),
			{ status: 500 }
		);
	}
}
