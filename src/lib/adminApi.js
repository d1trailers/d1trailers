import {
	getAdminEmailFromRequest,
	isAdminEmailAllowlisted,
} from "@/lib/adminAuth";

export function requireAdminApiSession(req) {
	const email = getAdminEmailFromRequest(req);
	if (!email) {
		return {
			error: Response.json({ error: "Unauthorized" }, { status: 401 }),
			email: null,
		};
	}

	if (!isAdminEmailAllowlisted(email)) {
		return {
			error: Response.json({ error: "Forbidden" }, { status: 403 }),
			email: null,
		};
	}

	return {
		error: null,
		email,
	};
}
