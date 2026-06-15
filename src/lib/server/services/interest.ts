import { buildInterestReceivedEmail } from "@/lib/email/templates";
import { interestSubmissionSchema } from "@/lib/contracts/interest";
import { createInterestSubmission } from "@/lib/server/repos/platform";
import { sendTransactionalEmail } from "@/lib/server/services/communications";

export async function submitInterest(rawInput: unknown) {
	const input = interestSubmissionSchema.parse(rawInput);

	const interest = await createInterestSubmission(null, input);

	const emailContent = buildInterestReceivedEmail({
		firstName: input.firstName,
		companyName: input.companyName,
	});

	await sendTransactionalEmail({
		type: "interest_received",
		recipientEmail: input.email,
		subject: emailContent.subject,
		html: emailContent.html,
		text: emailContent.text,
		payloadSnapshot: {
			interestSubmissionId: interest.id,
		},
	});

	return {
		tenantId: null,
		interestSubmissionId: interest.id,
	};
}
