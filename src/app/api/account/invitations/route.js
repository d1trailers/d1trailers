import { requireAuthenticatedAccountContext } from "@/lib/accountApi";
import {
	AccountAccessError,
	inviteTenantMember,
} from "@/lib/server/services/accounts";

export async function POST(request) {
	const auth = await requireAuthenticatedAccountContext();
	if (auth.error) return auth.error;

	try {
		const body = await request.json();
		const invitation = await inviteTenantMember(auth.context, body);
		return Response.json({ invitation }, { status: 201 });
	} catch (error) {
		if (error instanceof AccountAccessError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		if (error instanceof Error) {
			return Response.json({ error: error.message }, { status: 400 });
		}

		return Response.json({ error: "Failed to create invitation." }, { status: 500 });
	}
}
