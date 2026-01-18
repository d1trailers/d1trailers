import crypto from "crypto";

export async function POST(req) {
	const { email } = await req.json();

	if (!email) {
		return new Response(JSON.stringify({ error: "Email required" }), {
			status: 400,
		});
	}

	const token = crypto.randomBytes(32).toString("hex");
	const callbackUrl = `${process.env.NEXTAUTH_URL}/portal`;

	const magicLink =
		`${process.env.NEXTAUTH_URL}/api/auth/callback/email` +
		`?email=${encodeURIComponent(email)}` +
		`&token=${token}` +
		`&callbackUrl=${encodeURIComponent(callbackUrl)}`;

	console.log("========== MAGIC LINK (TEST MODE) ==========");
	console.log(magicLink);
	console.log("============================================");

	return new Response(
		JSON.stringify({
			message: "Magic link generated (check server console)",
		}),
		{ status: 200 }
	);
}
