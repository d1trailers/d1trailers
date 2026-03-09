import { NextResponse } from "next/server";
import {
	createAdminSessionToken,
	getAdminSessionCookieOptions,
	getAdminVerifyRedirectUrl,
	isAdminEmailAllowlisted,
	verifyAdminMagicLinkToken,
} from "@/lib/adminAuth";

export async function GET(req) {
	const { searchParams } = new URL(req.url);
	const token = searchParams.get("token");

	if (!token) {
		return Response.json({ error: "Token required" }, { status: 400 });
	}

	try {
		const email = verifyAdminMagicLinkToken(token);
		if (!email || !isAdminEmailAllowlisted(email)) {
			return Response.json({ error: "Invalid or expired token" }, { status: 403 });
		}

		const sessionToken = createAdminSessionToken(email);
		const cookieOptions = getAdminSessionCookieOptions();
		const response = NextResponse.redirect(getAdminVerifyRedirectUrl(req), {
			status: 302,
		});

		response.cookies.set({
			...cookieOptions,
			value: sessionToken,
		});

		return response;
	} catch {
		return Response.json({ error: "Invalid or expired token" }, { status: 403 });
	}
}
