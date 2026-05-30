import { sendEmail } from "@/lib/email/mailer";
import {
	createCommunicationEvent,
	updateCommunicationEvent,
} from "@/lib/server/repos/platform";

export async function sendTransactionalEmail(input: {
	type:
		| "interest_received"
		| "application_received"
		| "feedback_requested"
		| "application_approved"
		| "billing_notice"
		| "portal_access";
	recipientEmail: string;
	tenantId?: string | null;
	applicationId?: string | null;
	subject: string;
	html: string;
	text: string;
	payloadSnapshot?: Record<string, unknown>;
}) {
	console.log(`Email request made ${input.type} to ${input.recipientEmail}`);

	const event = await createCommunicationEvent({
		tenantId: input.tenantId ?? null,
		applicationId: input.applicationId ?? null,
		recipientEmail: input.recipientEmail,
		type: input.type,
		subject: input.subject,
		status: "pending",
		payloadSnapshot: input.payloadSnapshot ?? {},
		provider: "resend",
	});

	const result = await sendEmail({
		to: input.recipientEmail,
		subject: input.subject,
		html: input.html,
		text: input.text,
	});

	if (result.status === "sent") {
		return updateCommunicationEvent(event.id, {
			status: "sent",
			provider: result.provider,
			providerMessageId: result.providerMessageId,
			sentAt: new Date().toISOString(),
		});
	}

	return updateCommunicationEvent(event.id, {
		status: result.status,
		provider: result.provider,
		errorMessage: result.errorMessage,
	});
}
