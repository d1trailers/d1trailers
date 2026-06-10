import { requireAuthenticatedAccountContext } from "@/lib/accountApi";
import {
	AccountAccessError,
	updateInvitationState,
} from "@/lib/server/services/accounts";

export async function PATCH(request, { params }) {
	const auth = await requireAuthenticatedAccountContext();
	if (auth.error) return auth.error;

	try {
		const body = await request.json();
		const { invitationId } = await params;
		const invitation = await updateInvitationState(
			auth.context,
			invitationId,
			body
		);
		return Response.json({ invitation });
	} catch (error) {
		if (error instanceof AccountAccessError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		if (error instanceof Error) {
			return Response.json({ error: error.message }, { status: 400 });
		}

		return Response.json({ error: "Failed to update invitation." }, { status: 500 });
	}
}
