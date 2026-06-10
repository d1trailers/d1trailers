import { requireAuthenticatedAccountContext } from "@/lib/accountApi";
import {
	AccountAccessError,
	listAccountMembers,
} from "@/lib/server/services/accounts";

export async function GET() {
	const auth = await requireAuthenticatedAccountContext();
	if (auth.error) return auth.error;

	try {
		const result = await listAccountMembers(auth.context);
		return Response.json(result);
	} catch (error) {
		if (error instanceof AccountAccessError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		return Response.json({ error: "Failed to load account members." }, { status: 500 });
	}
}
