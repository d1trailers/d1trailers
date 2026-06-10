import { buildInterestReceivedEmail } from "@/lib/email/templates";
import { interestSubmissionSchema } from "@/lib/contracts/interest";
import {
	createLeadTenant,
	createInterestSubmission,
	createTimelineItem,
	getTenantByPrimaryEmail,
} from "@/lib/server/repos/platform";
import { ensureOwnerInvitationForTenant } from "@/lib/server/services/accounts";
import { sendTransactionalEmail } from "@/lib/server/services/communications";

export async function submitInterest(rawInput: unknown) {
	const input = interestSubmissionSchema.parse(rawInput);

	let tenant = await getTenantByPrimaryEmail(input.email);
	if (!tenant) {
		tenant = await createLeadTenant(input);
	}

	await ensureOwnerInvitationForTenant({
		tenantId: tenant.id,
		primaryEmail: tenant.primary_email,
	});

	const interest = await createInterestSubmission(tenant.id, input);

	await createTimelineItem({
		tenantId: tenant.id,
		type: "milestone",
		title: "Interest received",
		description:
			"Our team received your request and will review the details shortly.",
		visibleToTenant: false,
		metadata: {
			interestSubmissionId: interest.id,
		},
	});

	const emailContent = buildInterestReceivedEmail({
		firstName: input.firstName,
		companyName: input.companyName,
	});

	await sendTransactionalEmail({
		type: "interest_received",
		recipientEmail: input.email,
		tenantId: tenant.id,
		subject: emailContent.subject,
		html: emailContent.html,
		text: emailContent.text,
		payloadSnapshot: {
			interestSubmissionId: interest.id,
		},
	});

	return {
		tenantId: tenant.id,
		interestSubmissionId: interest.id,
	};
}
