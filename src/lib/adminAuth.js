import jwt from "jsonwebtoken";

export const ADMIN_COOKIE_NAME = "admin_session";
const ADMIN_MAGIC_LINK_TYPE = "admin-magic-link";
const ADMIN_SESSION_TYPE = "admin-session";
const DEFAULT_TOKEN_MAX_AGE_SECONDS = 900;

function parsePositiveInt(value) {
	const parsed = Number.parseInt(value ?? "", 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeEmail(email) {
	return String(email ?? "").trim().toLowerCase();
}

export function isValidEmail(email) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? "").trim());
}

function getJwtSecret() {
	return process.env.NEXTAUTH_SECRET ?? "";
}

function getMaxAgeSeconds() {
	return (
		parsePositiveInt(process.env.ADMIN_SESSION_MAX_AGE_SECONDS) ??
		parsePositiveInt(process.env.EMAIL_MAX_AGE_SECONDS) ??
		DEFAULT_TOKEN_MAX_AGE_SECONDS
	);
}

function getMagicLinkMaxAgeSeconds() {
	return (
		parsePositiveInt(process.env.ADMIN_MAGIC_LINK_MAX_AGE_SECONDS) ??
		getMaxAgeSeconds()
	);
}

export function getAdminAllowlist() {
	const raw =
		process.env.ADMIN_ALLOWLIST ?? process.env.ADMIN_ALLOWED_EMAILS ?? "";
	return new Set(
		raw
			.split(",")
			.map((email) => normalizeEmail(email))
			.filter(Boolean)
	);
}

export function isAdminEmailAllowlisted(email) {
	const normalizedEmail = normalizeEmail(email);
	if (!normalizedEmail) return false;
	return getAdminAllowlist().has(normalizedEmail);
}

export function createAdminMagicLinkToken(email) {
	const secret = getJwtSecret();
	if (!secret) {
		throw new Error("NEXTAUTH_SECRET is not configured");
	}

	return jwt.sign(
		{ email: normalizeEmail(email), type: ADMIN_MAGIC_LINK_TYPE },
		secret,
		{
			expiresIn: getMagicLinkMaxAgeSeconds(),
		}
	);
}

export function verifyAdminMagicLinkToken(token) {
	const secret = getJwtSecret();
	if (!secret) return null;

	try {
		const payload = jwt.verify(token, secret);
		const email =
			typeof payload === "object" && payload?.email
				? normalizeEmail(payload.email)
				: null;
		const type = typeof payload === "object" ? payload?.type : null;

		if (!email || type !== ADMIN_MAGIC_LINK_TYPE) {
			return null;
		}

		return email;
	} catch {
		return null;
	}
}

export function createAdminSessionToken(email) {
	const secret = getJwtSecret();
	if (!secret) {
		throw new Error("NEXTAUTH_SECRET is not configured");
	}

	return jwt.sign(
		{ email: normalizeEmail(email), type: ADMIN_SESSION_TYPE },
		secret,
		{
			expiresIn: getMaxAgeSeconds(),
		}
	);
}

export function verifyAdminSessionToken(token) {
	const secret = getJwtSecret();
	if (!secret || !token) return null;

	try {
		const payload = jwt.verify(token, secret);
		const email =
			typeof payload === "object" && payload?.email
				? normalizeEmail(payload.email)
				: null;
		const type = typeof payload === "object" ? payload?.type : null;

		if (!email || type !== ADMIN_SESSION_TYPE) {
			return null;
		}

		return email;
	} catch {
		return null;
	}
}

export function getAdminSessionCookieOptions() {
	return {
		name: ADMIN_COOKIE_NAME,
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: getMaxAgeSeconds(),
	};
}

export function getAdminEmailFromRequest(req) {
	const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
	return verifyAdminSessionToken(token);
}

export function getAdminVerifyRedirectUrl(req) {
	if (process.env.NEXTAUTH_URL) {
		return new URL("/admin", process.env.NEXTAUTH_URL);
	}
	return new URL("/admin", req.url);
}

export function getAdminMagicLinkUrl(req, token) {
	if (process.env.NEXTAUTH_URL) {
		const url = new URL("/api/admin/verify-magic-link", process.env.NEXTAUTH_URL);
		url.searchParams.set("token", token);
		return url.toString();
	}

	const url = new URL("/api/admin/verify-magic-link", req.url);
	url.searchParams.set("token", token);
	return url.toString();
}
