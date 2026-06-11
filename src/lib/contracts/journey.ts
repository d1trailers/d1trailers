import { z } from "zod";

export const TIMELINE_STAGE_VALUES = ["current", "upcoming", "completed"] as const;
export const TIMELINE_TYPE_VALUES = ["milestone", "action_required", "message"] as const;

export type TimelineStage = (typeof TIMELINE_STAGE_VALUES)[number];
export type TimelineType = (typeof TIMELINE_TYPE_VALUES)[number];

export const timelineStageSchema = z.enum(TIMELINE_STAGE_VALUES);
export const timelineTypeSchema = z.enum(TIMELINE_TYPE_VALUES);

export const JOURNEY_ITEM_KEYS = {
	interestReceived: "interest_received",
	applicationSubmitted: "application_submitted",
	reviewInProgress: "review_in_progress",
	feedbackRequested: "feedback_requested",
	applicationApproved: "application_approved",
	signDocuments: "sign_documents",
	reviewContract: "review_contract",
	pickUpTrailer: "pick_up_trailer",
} as const;

export type JourneyItemKey =
	(typeof JOURNEY_ITEM_KEYS)[keyof typeof JOURNEY_ITEM_KEYS];

export const JOURNEY_ITEM_DEFINITIONS = {
	[JOURNEY_ITEM_KEYS.interestReceived]: {
		title: "Interest received",
		type: "milestone",
		sortOrder: 10,
	},
	[JOURNEY_ITEM_KEYS.applicationSubmitted]: {
		title: "Application submitted",
		type: "milestone",
		sortOrder: 20,
	},
	[JOURNEY_ITEM_KEYS.reviewInProgress]: {
		title: "Application review in progress",
		type: "milestone",
		sortOrder: 30,
	},
	[JOURNEY_ITEM_KEYS.feedbackRequested]: {
		title: "Additional information requested",
		type: "action_required",
		sortOrder: 40,
	},
	[JOURNEY_ITEM_KEYS.applicationApproved]: {
		title: "Application approved",
		type: "milestone",
		sortOrder: 50,
	},
	[JOURNEY_ITEM_KEYS.signDocuments]: {
		title: "Sign Documents",
		type: "action_required",
		sortOrder: 60,
	},
	[JOURNEY_ITEM_KEYS.reviewContract]: {
		title: "Review Contract",
		type: "action_required",
		sortOrder: 70,
	},
	[JOURNEY_ITEM_KEYS.pickUpTrailer]: {
		title: "Pick Up Trailer",
		type: "action_required",
		sortOrder: 80,
	},
} as const satisfies Record<
	JourneyItemKey,
	{ title: string; type: TimelineType; sortOrder: number }
>;

export const manualTimelineUpdateSchema = z.object({
	itemKey: z
		.enum([
			JOURNEY_ITEM_KEYS.signDocuments,
			JOURNEY_ITEM_KEYS.reviewContract,
			JOURNEY_ITEM_KEYS.pickUpTrailer,
		])
		.optional(),
	title: z.string().trim().min(1).max(120).optional(),
	description: z.string().trim().max(600).optional().or(z.literal("")),
	stage: timelineStageSchema,
	type: timelineTypeSchema.optional(),
	dueAt: z.string().datetime({ offset: true }).optional().or(z.literal("")),
	ctaLabel: z.string().trim().max(60).optional().or(z.literal("")),
	ctaUrl: z.string().trim().url().optional().or(z.literal("")),
	visibleToTenant: z.boolean().optional().default(true),
	sendUpdateEmail: z.boolean().optional().default(false),
});
