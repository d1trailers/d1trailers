import {
	applicationDocumentTypes,
	applicationSubmissionSchema,
	requiredApplicationDocumentFields,
	type RequiredApplicationDocumentField,
} from "@/lib/contracts/application";
import {
	buildApplicationApprovedEmail,
	buildApplicationReceivedEmail,
	buildFeedbackRequestedEmail,
} from "@/lib/email/templates";
import {
	createApplication,
	createApplicationDocument,
	createTenant,
	updateApplicationReview,
	uploadApplicationFile,
	getApplicationById,
} from "@/lib/server/repos/platform";
import { ensureOwnerInvitationForTenant } from "@/lib/server/services/accounts";
import { sendTransactionalEmail } from "@/lib/server/services/communications";
import type { UserContext } from "@/lib/server/services/access";
import { syncJourneyAfterApplicationSubmission } from "@/lib/server/services/journey";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Set([
	"application/pdf",
	"image/jpeg",
	"image/png",
	"image/webp",
]);

function truthyFormValue(value: FormDataEntryValue | null) {
	if (typeof value !== "string") return false;
	return value === "on" || value === "true" || value === "1";
}

function stringValue(formData: FormData, key: string) {
	const value = formData.get(key);
	return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(value: string) {
	const digits = value.replace(/\D/g, "").slice(0, 10);
	if (digits.length <= 3) return digits;
	if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
	return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function normalizeEin(value: string) {
	const digits = value.replace(/\D/g, "").slice(0, 9);
	if (digits.length <= 2) return digits;
	return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

function normalizeSsn(value: string) {
	const digits = value.replace(/\D/g, "").slice(0, 9);
	if (digits.length <= 3) return digits;
	if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
	return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function normalizeDigits(value: string) {
	return value.replace(/\D/g, "");
}

function buildRequestedRentalRangeSummary(startDate: string, endDate: string) {
	if (!startDate || !endDate) return "";
	return `${startDate} to ${endDate}`;
}

function getRequiredFile(
	formData: FormData,
	field: RequiredApplicationDocumentField
) {
	const value = formData.get(field);
	if (!(value instanceof File) || !value.name) {
		throw new Error(`${applicationDocumentTypes[field].label} is required.`);
	}

	if (value.size > MAX_FILE_SIZE_BYTES) {
		throw new Error(
			`${applicationDocumentTypes[field].label} must be under 5 MB.`
		);
	}

	if (value.type && !ALLOWED_FILE_TYPES.has(value.type)) {
		throw new Error(
			`${applicationDocumentTypes[field].label} must be a PDF, JPG, PNG, or WebP file.`
		);
	}

	return value;
}

export async function submitApplication(formData: FormData) {
	const payload = applicationSubmissionSchema.parse({
		ownerFirstName: stringValue(formData, "ownerFirstName"),
		ownerLastName: stringValue(formData, "ownerLastName"),
		partnerFirstName: stringValue(formData, "partnerFirstName"),
		partnerLastName: stringValue(formData, "partnerLastName"),
		email: stringValue(formData, "email").toLowerCase(),
		phone: normalizePhone(stringValue(formData, "phone")),
		ownerAddress: stringValue(formData, "ownerAddress"),
		ownerCity: stringValue(formData, "ownerCity"),
		ownerRegion: stringValue(formData, "ownerRegion"),
		ownerZip: stringValue(formData, "ownerZip"),
		companyName: stringValue(formData, "companyName"),
		companyAddress: stringValue(formData, "companyAddress"),
		companyCity: stringValue(formData, "companyCity"),
		companyRegion: stringValue(formData, "companyRegion"),
		companyZip: stringValue(formData, "companyZip"),
		ein: normalizeEin(stringValue(formData, "ein")),
		mcNumber: normalizeDigits(stringValue(formData, "mcNumber")),
		usdot: normalizeDigits(stringValue(formData, "usdot")),
		requestedRentalStartDate: stringValue(formData, "requestedRentalStartDate"),
		requestedRentalEndDate: stringValue(formData, "requestedRentalEndDate"),
		rentalDuration: buildRequestedRentalRangeSummary(
			stringValue(formData, "requestedRentalStartDate"),
			stringValue(formData, "requestedRentalEndDate")
		),
		ref1Name: stringValue(formData, "ref1Name"),
		ref1Phone: normalizePhone(stringValue(formData, "ref1Phone")),
		ref2Name: stringValue(formData, "ref2Name"),
		ref2Phone: normalizePhone(stringValue(formData, "ref2Phone")),
		ref3Name: stringValue(formData, "ref3Name"),
		ref3Phone: normalizePhone(stringValue(formData, "ref3Phone")),
		ssn: normalizeSsn(stringValue(formData, "ssn")),
		ssnAuth: truthyFormValue(formData.get("ssnAuth")),
		insurance: truthyFormValue(formData.get("insurance")),
		maintenance: truthyFormValue(formData.get("maintenance")),
	});

	const files = Object.fromEntries(
		requiredApplicationDocumentFields.map((field) => [
			field,
			getRequiredFile(formData, field),
		])
	) as Record<RequiredApplicationDocumentField, File>;

	const tenant = await createTenant({
		displayName: payload.companyName,
		legalName: payload.companyName,
		primaryEmail: payload.email,
		primaryPhone: payload.phone,
		status: "stale",
	});

	await ensureOwnerInvitationForTenant({
		tenantId: tenant.id,
		primaryEmail: tenant.primary_email,
	});

	const application = await createApplication({
		tenantId: tenant.id,
		payload,
	});

	await syncJourneyAfterApplicationSubmission({
		application,
	});

	await Promise.all(
		requiredApplicationDocumentFields.map(async (field) => {
			const storagePath = await uploadApplicationFile({
				applicationId: application.id,
				documentField: field,
				file: files[field],
			});

			return createApplicationDocument({
				applicationId: application.id,
				bucket: "application-documents",
				storagePath,
				fileName: files[field].name,
				contentType: files[field].type,
				category: applicationDocumentTypes[field].category,
				documentType: applicationDocumentTypes[field].documentType,
			});
		})
	);

	const emailContent = buildApplicationReceivedEmail({
		firstName: payload.ownerFirstName,
		companyName: payload.companyName,
	});

	await sendTransactionalEmail({
		type: "application_received",
		recipientEmail: payload.email,
		tenantId: tenant.id,
		applicationId: application.id,
		subject: emailContent.subject,
		html: emailContent.html,
		text: emailContent.text,
		payloadSnapshot: {
			applicationId: application.id,
			tenantId: tenant.id,
			nextStep: "login_to_create_rental_request",
		},
	});

	return {
		tenantId: tenant.id,
		applicationId: application.id,
	};
}

export async function reviewApplication(input: {
	applicationId: string;
	action: "under_review" | "feedback_requested" | "approved" | "closed";
	reviewNotes?: string;
	actorContext: UserContext;
}) {
	const application = await getApplicationById(input.applicationId);
	if (!application) {
		throw new Error("Application not found.");
	}

	const statusMap: Record<string, string> = {
		under_review: "under_review",
		feedback_requested: "feedback_requested",
		approved: "approved",
		closed: "closed",
	};

	const nextStatus = statusMap[input.action];
	const reviewed = await updateApplicationReview({
		applicationId: input.applicationId,
		status: nextStatus,
		reviewNotes: input.reviewNotes,
		decisionByProfileId: input.actorContext.userId,
	});

	if (nextStatus === "feedback_requested") {
		const emailContent = buildFeedbackRequestedEmail({
			firstName: application.owner_first_name,
			companyName: application.company_name,
			reviewNotes: input.reviewNotes,
		});

		await sendTransactionalEmail({
			type: "feedback_requested",
			recipientEmail: application.primary_email,
			tenantId: application.tenant_id,
			applicationId: application.id,
			subject: emailContent.subject,
			html: emailContent.html,
			text: emailContent.text,
			payloadSnapshot: {
				applicationId: application.id,
				status: nextStatus,
			},
		});
	}

	if (nextStatus === "approved") {
		const emailContent = buildApplicationApprovedEmail({
			firstName: application.owner_first_name,
			companyName: application.company_name,
		});

		await sendTransactionalEmail({
			type: "application_approved",
			recipientEmail: application.primary_email,
			tenantId: application.tenant_id,
			applicationId: application.id,
			subject: emailContent.subject,
			html: emailContent.html,
			text: emailContent.text,
			payloadSnapshot: {
				applicationId: application.id,
				status: nextStatus,
				note:
					"Legacy application review action was used. Rental workflow remains driven from rentals.",
			},
		});
	}

	return reviewed;
}
