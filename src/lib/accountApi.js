import { getCurrentUserContext, isStaffContext } from "@/lib/server/services/access";

export async function requireAuthenticatedAccountContext() {
	const context = await getCurrentUserContext();

	if (!context) {
		return {
			error: Response.json({ error: "Unauthorized" }, { status: 401 }),
			context: null,
		};
	}

	if (isStaffContext(context)) {
		return {
			error: Response.json(
				{ error: "Staff accounts do not use tenant account management." },
				{ status: 403 }
			),
			context: null,
		};
	}

	return {
		error: null,
		context,
	};
}
