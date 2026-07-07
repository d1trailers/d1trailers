import {
	processDocuSignWebhook,
	SigningOperationError,
} from "@/lib/server/services/signing";

export async function POST(request) {
	try {
		const rawBody = await request.text();
		const signature = request.headers.get("x-docusign-signature-1");
		const result = await processDocuSignWebhook({ rawBody, signature });
		return Response.json(result, { status: 200 });
	} catch (error) {
		if (error instanceof SigningOperationError) {
			return Response.json({ error: error.message }, { status: error.status });
		}
		console.error("Failed to process DocuSign webhook:", error);
		return Response.json(
			{ error: error instanceof Error ? error.message : "Failed to process DocuSign webhook." },
			{ status: 500 }
		);
	}
}
