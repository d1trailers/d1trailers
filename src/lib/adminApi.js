import { getCurrentUserContext, isStaffContext } from "@/lib/server/services/access";

export async function requireAdminApiSession() {
	const context = await getCurrentUserContext();
	if (!context) {
		return {
			error: Response.json({ error: "Unauthorized" }, { status: 401 }),
			context: null,
		};
	}

	if (!isStaffContext(context)) {
		return {
			error: Response.json({ error: "Forbidden" }, { status: 403 }),
			context: null,
		};
	}

	return {
		error: null,
		context,
	};
}
