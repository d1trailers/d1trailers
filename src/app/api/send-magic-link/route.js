import jwt from "jsonwebtoken";
import {
	getCustomerByPrimaryEmail,
	isPortalEligibleCustomerStatus,
} from "@/lib/airtable";

const DEFAULT_MAGIC_LINK_AGE_SECONDS = 900;

function getTokenMaxAgeSeconds() {
	const value = Number.parseInt(
		process.env.PORTAL_MAGIC_LINK_MAX_AGE_SECONDS ??
			process.env.EMAIL_MAX_AGE_SECONDS ??
			"",
		10,
	);
	return Number.isFinite(value) && value > 0
		? value
		: DEFAULT_MAGIC_LINK_AGE_SECONDS;
}

function isValidEmail(email) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

	if (!process.env.NEXTAUTH_SECRET || !process.env.NEXTAUTH_URL) {
		return Response.json({ error: "Server configuration error" }, { status: 500 });
	}

	const responseMessage = {
		message:
			"If an eligible account exists for this email, a magic link has been generated.",
	};

	try {
		const customer = await getCustomerByPrimaryEmail(email);
		if (customer && isPortalEligibleCustomerStatus(customer.status)) {
			const token = jwt.sign(
				{ email, type: "magic-link" },
				process.env.NEXTAUTH_SECRET,
				{
					expiresIn: getTokenMaxAgeSeconds(),
				}
			);

			const magicLink = `${process.env.NEXTAUTH_URL}/api/verify-magic-link?token=${encodeURIComponent(
				token
			)}`;

			console.log("========== MAGIC LINK (TEST MODE) ==========");
			console.log(magicLink);
			console.log("============================================");
		}

		return Response.json(responseMessage, { status: 200 });
	} catch (error) {
		console.error("Failed to process magic link request:", error);
		return Response.json({ error: "Failed to process request" }, { status: 500 });
	}
}
