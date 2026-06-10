import { requireAuthenticatedAccountContext } from "@/lib/accountApi";
import { buildAccountContextPayload } from "@/lib/server/services/accounts";

export async function GET() {
	const auth = await requireAuthenticatedAccountContext();
	if (auth.error) return auth.error;

	return Response.json(buildAccountContextPayload(auth.context));
}
