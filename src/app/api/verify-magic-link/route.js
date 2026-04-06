import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const DEFAULT_SESSION_AGE_SECONDS = 900;

function getSessionMaxAgeSeconds() {
	const value = Number.parseInt(
		process.env.PORTAL_SESSION_MAX_AGE_SECONDS ??
			process.env.EMAIL_MAX_AGE_SECONDS ??
			"",
		10,
	);
	return Number.isFinite(value) && value > 0 ? value : DEFAULT_SESSION_AGE_SECONDS;
}

function getPortalRedirectUrl(req) {
	if (process.env.NEXTAUTH_URL) {
		return new URL("/portal", process.env.NEXTAUTH_URL);
	}
	return new URL("/portal", req.url);
}

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

	if (!process.env.NEXTAUTH_SECRET) {
		return Response.json({ error: "Server configuration error" }, { status: 500 });
	}

	try {
		const payload = jwt.verify(token, process.env.NEXTAUTH_SECRET);
		const email =
			typeof payload === "object" && payload?.email
				? String(payload.email).toLowerCase()
				: null;
		const tokenType =
			typeof payload === "object" && payload?.type ? payload.type : null;

		if (!email || tokenType !== "magic-link") {
			return NextResponse.redirect(getLoginExpiredRedirectUrl(req, "invalid"), {
				status: 302,
			});
		}

		const maxAge = getSessionMaxAgeSeconds();
		const sessionToken = jwt.sign(
			{ email, type: "portal-session" },
			process.env.NEXTAUTH_SECRET,
			{
				expiresIn: maxAge,
			}
		);

		const response = NextResponse.redirect(getPortalRedirectUrl(req), {
			status: 302,
		});
		response.cookies.set({
			name: "portal_session",
			value: sessionToken,
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge,
		});
		response.cookies.delete("email");

		return response;
	} catch (error) {
		return NextResponse.redirect(
			getLoginExpiredRedirectUrl(req, getFailureReason(error)),
			{ status: 302 }
		);
	}
}
