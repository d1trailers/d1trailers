import jwt from "jsonwebtoken";

function normalizeEmail(email) {
	return String(email ?? "").trim().toLowerCase();
}

export function getPortalEmailFromRequest(req) {
	const sessionToken = req.cookies.get("portal_session")?.value;
	if (!sessionToken || !process.env.NEXTAUTH_SECRET) return null;

	try {
		const payload = jwt.verify(sessionToken, process.env.NEXTAUTH_SECRET);
		const email =
			typeof payload === "object" && payload?.email
				? normalizeEmail(payload.email)
				: null;
		const tokenType =
			typeof payload === "object" && payload?.type ? payload.type : null;

		if (!email || tokenType !== "portal-session") {
			return null;
		}

		return email;
	} catch {
		return null;
	}
}

export function requirePortalApiSession(req) {
	if (!process.env.NEXTAUTH_SECRET) {
		return {
			error: Response.json({ error: "Server configuration error" }, { status: 500 }),
			email: null,
		};
	}

	const email = getPortalEmailFromRequest(req);
	if (!email) {
		return {
			error: Response.json({ error: "Unauthorized" }, { status: 401 }),
			email: null,
		};
	}

	return {
		error: null,
		email,
	};
}
