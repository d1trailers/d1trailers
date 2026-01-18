import crypto from "crypto";
import jwt from "jsonwebtoken";

export async function POST(req) {
	const { email } = await req.json();

	if (!email) {
		return new Response(JSON.stringify({ error: "Email required" }), {
			status: 400,
		});
	}

	// Create a short-lived JWT token for the magic link
	const token = jwt.sign({ email }, process.env.NEXTAUTH_SECRET, {
		expiresIn: "15m",
	});

	const magicLink = `${process.env.NEXTAUTH_URL}/api/verify-magic-link?token=${token}`;

	console.log("========== MAGIC LINK (TEST MODE) ==========");
	console.log(magicLink);
	console.log("============================================");

	return new Response(
		JSON.stringify({ message: "Magic link generated (check console)" }),
		{ status: 200 }
	);
}
