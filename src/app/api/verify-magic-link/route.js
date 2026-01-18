import jwt from "jsonwebtoken";

export async function GET(req) {
	const { searchParams } = new URL(req.url);
	const token = searchParams.get("token");

	if (!token) {
		return new Response(JSON.stringify({ error: "Token required" }), {
			status: 400,
		});
	}

	try {
		const payload = jwt.verify(token, process.env.NEXTAUTH_SECRET);
		const email = payload.email;

		// Redirect to portal and set a cookie
		const redirectUrl = `${process.env.NEXTAUTH_URL}/portal`;
		const res = new Response(null, {
			status: 302,
			headers: {
				Location: redirectUrl,
				"Set-Cookie": `email=${encodeURIComponent(email)}; Path=/; HttpOnly; Max-Age=900`,
			},
		});

		return res;
	} catch (err) {
		return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
			status: 403,
		});
	}
}
