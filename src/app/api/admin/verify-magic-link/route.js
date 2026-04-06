import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import {
	createAdminSessionToken,
	getAdminSessionCookieOptions,
	getAdminVerifyRedirectUrl,
	isAdminEmailAllowlisted,
} from "@/lib/adminAuth";

function getLoginExpiredRedirectUrl(req, reason = "expired") {
	const baseUrl = process.env.NEXTAUTH_URL ?? req.url;
	const url = new URL("/login/expired", baseUrl);
	url.searchParams.set("reason", reason);
	return url;
}

function getFailureReason(error) {
	if (error?.name === "TokenExpiredError") {
		return "expired";
	}
	return "invalid";
}

export async function GET(req) {
	const { searchParams } = new URL(req.url);
	const token = searchParams.get("token");

	if (!token) {
		return NextResponse.redirect(getLoginExpiredRedirectUrl(req, "missing"), {
			status: 302,
		});
	}

	const secret = process.env.NEXTAUTH_SECRET ?? "";
	if (!secret) {
		return Response.json({ error: "Server configuration error" }, { status: 500 });
	}

	try {
		const payload = jwt.verify(token, secret);
		const email =
			typeof payload === "object" && payload?.email
				? String(payload.email).trim().toLowerCase()
				: null;
		const tokenType = typeof payload === "object" ? payload?.type : null;

		if (!email || tokenType !== "admin-magic-link" || !isAdminEmailAllowlisted(email)) {
			return NextResponse.redirect(getLoginExpiredRedirectUrl(req, "invalid"), {
				status: 302,
			});
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
	} catch (error) {
		return NextResponse.redirect(
			getLoginExpiredRedirectUrl(req, getFailureReason(error)),
			{ status: 302 }
		);
	}
}
