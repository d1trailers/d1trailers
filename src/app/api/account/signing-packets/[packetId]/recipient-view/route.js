import { requireAuthenticatedAccountContext } from "@/lib/accountApi";
import {
	createSigningRecipientViewForAccount,
	SigningOperationError,
} from "@/lib/server/services/signing";

export async function POST(_request, { params }) {
	const auth = await requireAuthenticatedAccountContext();
	if (auth.error) return auth.error;

	const resolvedParams = await params;
	const packetId =
		typeof resolvedParams?.packetId === "string" ? resolvedParams.packetId : "";
	if (!packetId) {
		return Response.json({ error: "Signing packet ID is required." }, { status: 400 });
	}

	try {
		const result = await createSigningRecipientViewForAccount(auth.context, packetId);
		return Response.json(result, { status: 200 });
	} catch (error) {
		if (error instanceof SigningOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}
		console.error("Failed to create signing recipient view:", error);
		return Response.json(
			{ error: error instanceof Error ? error.message : "Failed to create signing view." },
			{ status: 500 }
		);
	}
}
