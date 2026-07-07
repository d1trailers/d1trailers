import { requireAdminApiSession } from "@/lib/adminApi";
import {
	SigningOperationError,
	voidSigningPacketForStaff,
} from "@/lib/server/services/signing";

export async function POST(_request, { params }) {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	const resolvedParams = await params;
	const packetId =
		typeof resolvedParams?.packetId === "string" ? resolvedParams.packetId : "";
	if (!packetId) {
		return Response.json({ error: "Signing packet ID is required." }, { status: 400 });
	}

	try {
		const packet = await voidSigningPacketForStaff(auth.context, packetId);
		return Response.json({ packet }, { status: 200 });
	} catch (error) {
		if (error instanceof SigningOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}
		console.error("Failed to void signing packet:", error);
		return Response.json(
			{ error: error instanceof Error ? error.message : "Failed to void signing packet." },
			{ status: 500 }
		);
	}
}
