import {
	createAdminMagicLinkToken,
	getAdminAllowlist,
	getAdminMagicLinkUrl,
	isAdminEmailAllowlisted,
	isValidEmail,
} from "@/lib/adminAuth";

export async function POST(req) {
	let body;
	try {
		body = await req.json();
	} catch {
		return Response.json({ error: "Invalid request body" }, { status: 400 });
	}

	const email =
		typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

	if (!isValidEmail(email)) {
		return Response.json({ error: "Valid email required" }, { status: 400 });
	}

	const response = {
		message:
			"If this admin email is authorized, a secure login link has been generated.",
	};

	try {
		const isAllowlisted = isAdminEmailAllowlisted(email);
		if (process.env.NODE_ENV !== "production") {
			const allowlistPreview = Array.from(getAdminAllowlist()).join(", ") || "(empty)";
			console.log(
				`[ADMIN MAGIC LINK] email=${email} allowlisted=${isAllowlisted} allowlist=${allowlistPreview}`
			);
		}

		if (isAllowlisted) {
			const token = createAdminMagicLinkToken(email);
			const magicLink = getAdminMagicLinkUrl(req, token);

			console.log("========== ADMIN MAGIC LINK (TEST MODE) ==========");
			console.log(magicLink);
			console.log("==================================================");
		}

		return Response.json(response, { status: 200 });
	} catch (error) {
		console.error("Failed to process admin magic link request:", error);
		return Response.json(
			{ error: "Failed to process request" },
			{ status: 500 },
		);
	}
}
