import { Resend } from "resend";
import { env, isResendConfigured } from "@/lib/server/env";

export type EmailDeliveryResult =
	| {
			status: "sent";
			provider: "resend";
			providerMessageId: string | null;
	  }
	| {
			status: "failed";
			provider: "resend";
			errorMessage: string;
	  }
	| {
			status: "skipped";
			provider: "resend";
			errorMessage: string;
	  };

let resendClient: Resend | null = null;

function getResendClient() {
	if (!isResendConfigured()) return null;
	if (resendClient) return resendClient;
	resendClient = new Resend(env.RESEND_API_KEY);
	return resendClient;
}

export async function sendEmail(input: {
	to: string;
	subject: string;
	html: string;
	text: string;
}) {
	const client = getResendClient();
	if (!client || !env.RESEND_FROM_EMAIL) {
		return {
			status: "skipped",
			provider: "resend",
			errorMessage: "Resend is not fully configured in this environment.",
		} satisfies EmailDeliveryResult;
	}

	try {
		const response = await client.emails.send({
			from: env.RESEND_FROM_EMAIL,
			to: [input.to],
			subject: input.subject,
			html: input.html,
			text: input.text,
		});

		if (response.error) {
			return {
				status: "failed",
				provider: "resend",
				errorMessage: response.error.message,
			} satisfies EmailDeliveryResult;
		}

		return {
			status: "sent",
			provider: "resend",
			providerMessageId: response.data?.id ?? null,
		} satisfies EmailDeliveryResult;
	} catch (error) {
		return {
			status: "failed",
			provider: "resend",
			errorMessage:
				error instanceof Error ? error.message : "Unknown email delivery error.",
		} satisfies EmailDeliveryResult;
	}
}
