import { requireAuthenticatedAccountContext } from "@/lib/accountApi";
import {
	AccountAccessError,
	updateTenantMemberAccess,
} from "@/lib/server/services/accounts";

export async function PATCH(request, { params }) {
	const auth = await requireAuthenticatedAccountContext();
	if (auth.error) return auth.error;

	try {
		const body = await request.json();
		const { membershipId } = await params;
		const membership = await updateTenantMemberAccess(
			auth.context,
			membershipId,
			body
		);
		return Response.json({ membership });
	} catch (error) {
		if (error instanceof AccountAccessError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		if (error instanceof Error) {
			return Response.json({ error: error.message }, { status: 400 });
		}

		return Response.json({ error: "Failed to update member." }, { status: 500 });
	}
}
