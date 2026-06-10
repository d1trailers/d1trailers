import { requireAuthenticatedAccountContext } from "@/lib/accountApi";
import {
	AccountAccessError,
	switchActiveTenant,
} from "@/lib/server/services/accounts";

export async function POST(request) {
	const auth = await requireAuthenticatedAccountContext();
	if (auth.error) return auth.error;

	try {
		const body = await request.json();
		const result = await switchActiveTenant(auth.context, body);
		return Response.json(result);
	} catch (error) {
		if (error instanceof AccountAccessError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		if (error instanceof Error) {
			return Response.json({ error: error.message }, { status: 400 });
		}

		return Response.json({ error: "Failed to switch accounts." }, { status: 500 });
	}
}
