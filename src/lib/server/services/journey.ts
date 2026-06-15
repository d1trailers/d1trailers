import {
	JOURNEY_ITEM_DEFINITIONS,
	JOURNEY_ITEM_KEYS,
	manualTimelineUpdateSchema,
	type JourneyItemKey,
	type TimelineStage,
	type TimelineType,
} from "@/lib/contracts/journey";
import { buildTimelineUpdateEmail } from "@/lib/email/templates";
import {
	getApplicationById,
	getRentalById,
	getTimelineItemByKey,
	type ApplicationRecord,
	type RentalRecord,
	type TenantRecord,
	type TimelineItemRecord,
	updateTimelineItem,
	upsertTimelineItemByKey,
} from "@/lib/server/repos/platform";
import { sendTransactionalEmail } from "@/lib/server/services/communications";
import type { UserContext } from "@/lib/server/services/access";

type JourneyApplication = ApplicationRecord & {
	tenant?: TenantRecord;
	payload?: Record<string, unknown>;
};

type JourneyRental = RentalRecord & {
	tenant?: TenantRecord | null;
	application?: ApplicationRecord | null;
};

function nowIso() {
	return new Date().toISOString();
}

function getApplicantFirstName(application: JourneyApplication) {
	return (
		application.owner_first_name ||
		String(application.payload?.ownerFirstName || "").trim() ||
		"there"
	);
}

function buildStandardJourneyItem(
	key: JourneyItemKey,
	input?: Partial<{
		title: string;
		description: string | null;
		stage: TimelineStage;
		type: TimelineType;
		visibleToTenant: boolean;
		dueAt: string | null;
		ctaLabel: string | null;
		ctaUrl: string | null;
		sortOrder: number;
		completedAt: string | null;
		metadata: Record<string, unknown>;
	}>
) {
	const definition = JOURNEY_ITEM_DEFINITIONS[key];
	const stage = input?.stage ?? "upcoming";

	return {
		itemKey: key,
		type: input?.type ?? definition.type,
		stage,
		title: input?.title ?? definition.title,
		description: input?.description ?? null,
		visibleToTenant: input?.visibleToTenant ?? true,
		dueAt: input?.dueAt ?? null,
		ctaLabel: input?.ctaLabel ?? null,
		ctaUrl: input?.ctaUrl ?? null,
		sortOrder: input?.sortOrder ?? definition.sortOrder,
		completedAt:
			stage === "completed"
				? input?.completedAt ?? nowIso()
				: input?.completedAt ?? null,
		metadata: input?.metadata ?? {},
	};
}

async function publishStandardJourneyItem(input: {
	tenantId: string;
	applicationId?: string | null;
	rentalId?: string | null;
	key: JourneyItemKey;
	actorProfileId?: string | null;
	stage?: TimelineStage;
	description?: string | null;
	visibleToTenant?: boolean;
	dueAt?: string | null;
	ctaLabel?: string | null;
	ctaUrl?: string | null;
	metadata?: Record<string, unknown>;
}) {
	const item = buildStandardJourneyItem(input.key, {
		stage: input.stage,
		description: input.description ?? null,
		visibleToTenant: input.visibleToTenant ?? true,
		dueAt: input.dueAt ?? null,
		ctaLabel: input.ctaLabel ?? null,
		ctaUrl: input.ctaUrl ?? null,
		metadata: input.metadata ?? {},
	});

	return upsertTimelineItemByKey({
		tenantId: input.tenantId,
		applicationId: input.applicationId ?? null,
		rentalId: input.rentalId ?? null,
		itemKey: item.itemKey,
		type: item.type,
		stage: item.stage,
		title: item.title,
		description: item.description,
		visibleToTenant: item.visibleToTenant,
		dueAt: item.dueAt,
		completedAt: item.completedAt,
		ctaLabel: item.ctaLabel,
		ctaUrl: item.ctaUrl,
		sortOrder: item.sortOrder,
		metadata: item.metadata,
		createdByProfileId: input.actorProfileId ?? null,
		updatedByProfileId: input.actorProfileId ?? null,
	});
}

async function completeExistingJourneyItem(input: {
	tenantId: string;
	applicationId?: string | null;
	rentalId?: string | null;
	key: JourneyItemKey;
	description?: string | null;
	metadata?: Record<string, unknown>;
	actorProfileId?: string | null;
}) {
	const existing = await getTimelineItemByKey({
		tenantId: input.tenantId,
		applicationId: input.applicationId ?? null,
		rentalId: input.rentalId ?? null,
		itemKey: input.key,
	});

	if (!existing) {
		return null;
	}

	return publishStandardJourneyItem({
		tenantId: input.tenantId,
		applicationId: input.applicationId ?? null,
		rentalId: input.rentalId ?? null,
		key: input.key,
		stage: "completed",
		description: input.description ?? existing.description ?? null,
		metadata: input.metadata ?? {},
		actorProfileId: input.actorProfileId ?? null,
	});
}

async function sendTimelineUpdateNotice(input: {
	application: JourneyApplication;
	timelineItem: TimelineItemRecord;
}) {
	const email = buildTimelineUpdateEmail({
		firstName: getApplicantFirstName(input.application),
		companyName: input.application.company_name,
		title: input.timelineItem.title,
		description: input.timelineItem.description,
	});

	await sendTransactionalEmail({
		type: "timeline_update",
		recipientEmail: input.application.primary_email,
		tenantId: input.application.tenant_id,
		applicationId: input.application.id,
		rentalId: input.timelineItem.rental_id ?? null,
		subject: email.subject,
		html: email.html,
		text: email.text,
		payloadSnapshot: {
			timelineItemId: input.timelineItem.id,
			itemKey: input.timelineItem.item_key,
			stage: input.timelineItem.stage,
		},
	});
}

async function sendRentalTimelineUpdateNotice(input: {
	rental: JourneyRental;
	timelineItem: TimelineItemRecord;
}) {
	const email = buildTimelineUpdateEmail({
		firstName:
			input.rental.application?.owner_first_name ||
			String(input.rental.application?.payload?.ownerFirstName || "").trim() ||
			"there",
		companyName:
			input.rental.application?.company_name ||
			input.rental.tenant?.display_name ||
			"D1 Trailers",
		title: input.timelineItem.title,
		description: input.timelineItem.description,
	});

	await sendTransactionalEmail({
		type: "timeline_update",
		recipientEmail:
			input.rental.application?.primary_email ||
			input.rental.tenant?.primary_email ||
			"",
		tenantId: input.rental.tenant_id,
		applicationId: input.rental.application_id,
		rentalId: input.rental.id,
		subject: email.subject,
		html: email.html,
		text: email.text,
		payloadSnapshot: {
			timelineItemId: input.timelineItem.id,
			itemKey: input.timelineItem.item_key,
			stage: input.timelineItem.stage,
		},
	});
}

export async function syncJourneyAfterInterest(input: {
	tenantId: string;
	description?: string | null;
}) {
	await upsertTimelineItemByKey({
		tenantId: input.tenantId,
		itemKey: JOURNEY_ITEM_KEYS.interestReceived,
		type: JOURNEY_ITEM_DEFINITIONS[JOURNEY_ITEM_KEYS.interestReceived].type,
		stage: "current",
		title: JOURNEY_ITEM_DEFINITIONS[JOURNEY_ITEM_KEYS.interestReceived].title,
		description:
			input.description ??
			"Our team received your request. If you are ready to move forward, complete the application and we'll begin the review.",
		visibleToTenant: true,
		ctaLabel: "Complete Application",
		ctaUrl: "/apply",
		sortOrder: JOURNEY_ITEM_DEFINITIONS[JOURNEY_ITEM_KEYS.interestReceived].sortOrder,
		metadata: {
			source: "interest_form",
		},
	});
}

export async function syncJourneyAfterApplicationSubmission(input: {
	application: JourneyApplication;
	rentalId?: string | null;
}) {
	await upsertTimelineItemByKey({
		tenantId: input.application.tenant_id,
		itemKey: JOURNEY_ITEM_KEYS.interestReceived,
		type: JOURNEY_ITEM_DEFINITIONS[JOURNEY_ITEM_KEYS.interestReceived].type,
		stage: "completed",
		title: JOURNEY_ITEM_DEFINITIONS[JOURNEY_ITEM_KEYS.interestReceived].title,
		description:
			"We received your initial request and moved it into the full application review process.",
		visibleToTenant: true,
		completedAt: nowIso(),
		sortOrder: JOURNEY_ITEM_DEFINITIONS[JOURNEY_ITEM_KEYS.interestReceived].sortOrder,
		metadata: {
			applicationId: input.application.id,
			rentalId: input.rentalId ?? null,
		},
	});

	await publishStandardJourneyItem({
		tenantId: input.application.tenant_id,
		applicationId: input.application.id,
		rentalId: input.rentalId ?? null,
		key: JOURNEY_ITEM_KEYS.applicationSubmitted,
		stage: "completed",
		description:
			"Your application is on file with D1Trailers and is ready for internal review.",
		metadata: {
			status: input.application.status,
			rentalId: input.rentalId ?? null,
		},
	});

	await publishStandardJourneyItem({
		tenantId: input.application.tenant_id,
		applicationId: input.application.id,
		rentalId: input.rentalId ?? null,
		key: JOURNEY_ITEM_KEYS.reviewInProgress,
		stage: "current",
		description:
			"Our team is reviewing your application and documents. We'll let you know if anything else is needed.",
		metadata: {
			status: input.application.status,
			rentalId: input.rentalId ?? null,
		},
	});
}

export async function syncJourneyAfterApplicationReview(input: {
	application: JourneyApplication;
	nextStatus: string;
	reviewNotes?: string | null;
	actorProfileId?: string | null;
}) {
	const tenantId = input.application.tenant_id;
	const applicationId = input.application.id;

	await publishStandardJourneyItem({
		tenantId,
		applicationId,
		key: JOURNEY_ITEM_KEYS.applicationSubmitted,
		stage: "completed",
		description:
			"Your application is on file with D1Trailers and is ready for internal review.",
		metadata: {
			status: input.nextStatus,
		},
		actorProfileId: input.actorProfileId ?? null,
	});

	if (input.nextStatus === "under_review") {
		await publishStandardJourneyItem({
			tenantId,
			applicationId,
			key: JOURNEY_ITEM_KEYS.reviewInProgress,
			stage: "current",
			description:
				"Our team is actively reviewing your application and supporting documents.",
			metadata: {
				status: input.nextStatus,
			},
			actorProfileId: input.actorProfileId ?? null,
		});

		await completeExistingJourneyItem({
			tenantId,
			applicationId,
			key: JOURNEY_ITEM_KEYS.feedbackRequested,
			description:
				input.reviewNotes ||
				"Additional details were requested and your application is back in review.",
			metadata: {
				status: input.nextStatus,
			},
			actorProfileId: input.actorProfileId ?? null,
		});

		return;
	}

	if (input.nextStatus === "feedback_requested") {
		await publishStandardJourneyItem({
			tenantId,
			applicationId,
			key: JOURNEY_ITEM_KEYS.reviewInProgress,
			stage: "completed",
			description:
				"Our initial review is complete and we need a little more information from you.",
			metadata: {
				status: input.nextStatus,
			},
			actorProfileId: input.actorProfileId ?? null,
		});

		await publishStandardJourneyItem({
			tenantId,
			applicationId,
			key: JOURNEY_ITEM_KEYS.feedbackRequested,
			stage: "current",
			description:
				input.reviewNotes ||
				"Our team needs more information before the application can move forward.",
			metadata: {
				status: input.nextStatus,
			},
			actorProfileId: input.actorProfileId ?? null,
		});

		return;
	}

	if (input.nextStatus === "approved") {
		await publishStandardJourneyItem({
			tenantId,
			applicationId,
			key: JOURNEY_ITEM_KEYS.reviewInProgress,
			stage: "completed",
			description:
				"Our internal review is complete and your application is moving into next steps.",
			metadata: {
				status: input.nextStatus,
			},
			actorProfileId: input.actorProfileId ?? null,
		});

		await completeExistingJourneyItem({
			tenantId,
			applicationId,
			key: JOURNEY_ITEM_KEYS.feedbackRequested,
			description:
				input.reviewNotes ||
				"Any required follow-up information has been resolved.",
			metadata: {
				status: input.nextStatus,
			},
			actorProfileId: input.actorProfileId ?? null,
		});

		await publishStandardJourneyItem({
			tenantId,
			applicationId,
			key: JOURNEY_ITEM_KEYS.applicationApproved,
			stage: "completed",
			description:
				"Your application has been approved and your account is now moving into contract and pickup preparation.",
			metadata: {
				status: input.nextStatus,
			},
			actorProfileId: input.actorProfileId ?? null,
		});

		await publishStandardJourneyItem({
			tenantId,
			applicationId,
			key: JOURNEY_ITEM_KEYS.signDocuments,
			stage: "current",
			description:
				"Review and sign the required rental documents so your trailer can be released.",
			metadata: {
				status: input.nextStatus,
			},
			actorProfileId: input.actorProfileId ?? null,
		});

		await publishStandardJourneyItem({
			tenantId,
			applicationId,
			key: JOURNEY_ITEM_KEYS.reviewContract,
			stage: "upcoming",
			description:
				"Review your rental contract details once the document packet is ready.",
			metadata: {
				status: input.nextStatus,
			},
			actorProfileId: input.actorProfileId ?? null,
		});

		await publishStandardJourneyItem({
			tenantId,
			applicationId,
			key: JOURNEY_ITEM_KEYS.pickUpTrailer,
			stage: "upcoming",
			description:
				"Coordinate pickup details once your documents and contract steps are complete.",
			metadata: {
				status: input.nextStatus,
			},
			actorProfileId: input.actorProfileId ?? null,
		});

		return;
	}

	if (input.nextStatus === "closed") {
		await publishStandardJourneyItem({
			tenantId,
			applicationId,
			key: JOURNEY_ITEM_KEYS.reviewInProgress,
			stage: "completed",
			description: "The review workflow on this application has been closed.",
			metadata: {
				status: input.nextStatus,
			},
			actorProfileId: input.actorProfileId ?? null,
		});

		await completeExistingJourneyItem({
			tenantId,
			applicationId,
			key: JOURNEY_ITEM_KEYS.feedbackRequested,
			description:
				input.reviewNotes || "Any outstanding follow-up requests are no longer active.",
			metadata: {
				status: input.nextStatus,
			},
			actorProfileId: input.actorProfileId ?? null,
		});
	}
}

export async function publishManualApplicationTimelineUpdate(input: {
	applicationId: string;
	rawInput: unknown;
	actorContext: UserContext;
}) {
	const application = (await getApplicationById(input.applicationId)) as JourneyApplication | null;
	if (!application) {
		throw new Error("Application not found.");
	}

	const payload = manualTimelineUpdateSchema.parse(input.rawInput);
	const key = payload.itemKey ?? `custom_${Date.now()}`;
	const standardDefinition = payload.itemKey
		? JOURNEY_ITEM_DEFINITIONS[payload.itemKey]
		: null;
	const stage = payload.stage;
	const title = payload.title ?? standardDefinition?.title;

	if (!title) {
		throw new Error("A timeline title is required.");
	}

	const timelineItem = await upsertTimelineItemByKey({
		tenantId: application.tenant_id,
		applicationId: application.id,
		itemKey: key,
		type: payload.type ?? standardDefinition?.type ?? "action_required",
		stage,
		title,
		description: payload.description || null,
		visibleToTenant: payload.visibleToTenant ?? true,
		dueAt: payload.dueAt || null,
		completedAt: stage === "completed" ? nowIso() : null,
		ctaLabel: payload.ctaLabel || null,
		ctaUrl: payload.ctaUrl || null,
		sortOrder: standardDefinition?.sortOrder ?? 90,
		metadata: {
			manualUpdate: true,
			itemKey: key,
		},
		createdByProfileId: input.actorContext.userId,
		updatedByProfileId: input.actorContext.userId,
	});

	if (payload.sendUpdateEmail && timelineItem.visible_to_tenant) {
		await sendTimelineUpdateNotice({
			application,
			timelineItem,
		});
	}

	return timelineItem;
}

export async function publishManualRentalTimelineUpdate(input: {
	rentalId: string;
	rawInput: unknown;
	actorContext: UserContext;
}) {
	const rental = (await getRentalById(input.rentalId)) as JourneyRental | null;
	if (!rental || !rental.tenant) {
		throw new Error("Rental not found.");
	}

	const payload = manualTimelineUpdateSchema.parse(input.rawInput);
	const key = payload.itemKey ?? `custom_${Date.now()}`;
	const standardDefinition = payload.itemKey
		? JOURNEY_ITEM_DEFINITIONS[payload.itemKey]
		: null;
	const stage = payload.stage;
	const title = payload.title ?? standardDefinition?.title;

	if (!title) {
		throw new Error("A timeline title is required.");
	}

	const timelineItem = await upsertTimelineItemByKey({
		tenantId: rental.tenant_id,
		applicationId: rental.application_id ?? null,
		rentalId: rental.id,
		itemKey: key,
		type: payload.type ?? standardDefinition?.type ?? "action_required",
		stage,
		title,
		description: payload.description || null,
		visibleToTenant: payload.visibleToTenant ?? true,
		dueAt: payload.dueAt || null,
		completedAt: stage === "completed" ? nowIso() : null,
		ctaLabel: payload.ctaLabel || null,
		ctaUrl: payload.ctaUrl || null,
		sortOrder: standardDefinition?.sortOrder ?? 90,
		metadata: {
			manualUpdate: true,
			itemKey: key,
			rentalId: rental.id,
		},
		createdByProfileId: input.actorContext.userId,
		updatedByProfileId: input.actorContext.userId,
	});

	if (
		payload.sendUpdateEmail &&
		timelineItem.visible_to_tenant &&
		(rental.application?.primary_email || rental.tenant?.primary_email)
	) {
		await sendRentalTimelineUpdateNotice({
			rental,
			timelineItem,
		});
	}

	return timelineItem;
}

export async function setApplicationTimelineStage(input: {
	applicationId: string;
	itemKey: JourneyItemKey;
	stage: TimelineStage;
	description?: string | null;
	actorContext: UserContext;
	sendUpdateEmail?: boolean;
}) {
	const application = (await getApplicationById(input.applicationId)) as JourneyApplication | null;
	if (!application) {
		throw new Error("Application not found.");
	}

	const timelineItem = await publishStandardJourneyItem({
		tenantId: application.tenant_id,
		applicationId: application.id,
		key: input.itemKey,
		stage: input.stage,
		description: input.description ?? null,
		actorProfileId: input.actorContext.userId,
		metadata: {
			manualUpdate: true,
		},
	});

	if (input.sendUpdateEmail && timelineItem.visible_to_tenant) {
		await sendTimelineUpdateNotice({
			application,
			timelineItem,
		});
	}

	return timelineItem;
}

export async function markTimelineItemCompleted(input: {
	timelineItemId: string;
	actorProfileId?: string | null;
}) {
	return updateTimelineItem({
		timelineItemId: input.timelineItemId,
		stage: "completed",
		completedAt: nowIso(),
		updatedByProfileId: input.actorProfileId ?? null,
	});
}

export async function getJourneyTimelineItem(input: {
	tenantId: string;
	applicationId?: string | null;
	itemKey: JourneyItemKey;
}) {
	return getTimelineItemByKey(input);
}



