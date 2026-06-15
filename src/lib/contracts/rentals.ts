import { z } from "zod";

export const BILLING_FREQUENCY_VALUES = ["weekly", "monthly", "yearly"] as const;
export const RENTAL_STATUS_VALUES = [
	"draft",
	"customer_review",
	"changes_pending",
	"awaiting_first_payment",
	"active",
	"past_due",
	"suspended",
	"returned",
	"declined",
	"cancelled",
] as const;
export const BILLING_STATUS_VALUES = [
	"draft",
	"awaiting_first_payment",
	"active",
	"past_due",
	"suspended",
	"cancelled",
	"unpaid",
] as const;
export const TRAILER_STATUS_VALUES = [
	"available",
	"reserved",
	"rented",
	"maintenance",
	"retired",
] as const;
export const RENTAL_RECORD_KIND_VALUES = ["request", "agreement"] as const;
export const RENTAL_REQUEST_KIND_VALUES = [
	"initial_application",
	"new_rental",
	"rental_expansion",
	"modification_request",
	"admin_created",
] as const;
export const RENTAL_REQUEST_OUTCOME_VALUES = [
	"approved_as_agreement",
	"merged_into_parent",
	"denied",
	"cancelled",
] as const;
export const TENANT_REQUEST_KIND_VALUES = [
	"new_rental",
] as const;

export type BillingFrequency = (typeof BILLING_FREQUENCY_VALUES)[number];
export type RentalStatus = (typeof RENTAL_STATUS_VALUES)[number];
export type BillingStatus = (typeof BILLING_STATUS_VALUES)[number];
export type TrailerStatus = (typeof TRAILER_STATUS_VALUES)[number];
export type RentalRecordKind = (typeof RENTAL_RECORD_KIND_VALUES)[number];
export type RentalRequestKind = (typeof RENTAL_REQUEST_KIND_VALUES)[number];
export type RentalRequestOutcome = (typeof RENTAL_REQUEST_OUTCOME_VALUES)[number];
export type TenantRequestKind = (typeof TENANT_REQUEST_KIND_VALUES)[number];

export const billingFrequencySchema = z.enum(BILLING_FREQUENCY_VALUES);
export const rentalStatusSchema = z.enum(RENTAL_STATUS_VALUES);
export const billingStatusSchema = z.enum(BILLING_STATUS_VALUES);
export const trailerStatusSchema = z.enum(TRAILER_STATUS_VALUES);
export const rentalRecordKindSchema = z.enum(RENTAL_RECORD_KIND_VALUES);
export const rentalRequestKindSchema = z.enum(RENTAL_REQUEST_KIND_VALUES);
export const rentalRequestOutcomeSchema = z.enum(RENTAL_REQUEST_OUTCOME_VALUES);
export const tenantRequestKindSchema = z.enum(TENANT_REQUEST_KIND_VALUES);

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const optionalCurrencySchema = z
	.union([z.number(), z.string()])
	.transform((value) => {
		if (value === null || value === undefined || value === "") return null;
		const numericValue = typeof value === "number" ? value : Number(value);
		return Number.isFinite(numericValue) ? numericValue : Number.NaN;
	})
	.refine((value) => value === null || (Number.isFinite(value) && value >= 0), {
		message: "Enter a valid amount.",
	});

export const rentalRequestCreateSchema = z
	.object({
		requestType: tenantRequestKindSchema,
		parentRentalId: z.string().uuid().optional().or(z.literal("")).transform((value) => value || null),
		requestedTrailerCount: z.coerce.number().int().positive("Trailer count must be at least 1."),
		requestedTrailerType: z.string().trim().min(1, "Trailer type is required.").max(120),
		contractStartDate: isoDateSchema,
		endDate: isoDateSchema,
		billingFrequency: billingFrequencySchema.default("monthly"),
		requestSummary: z.string().trim().max(2000).optional().default(""),
	});

export const adminRentalCreateSchema = z.object({
	tenantId: z.string().uuid(),
	status: rentalStatusSchema.default("draft"),
	billingStatus: billingStatusSchema.default("draft"),
	billingFrequency: billingFrequencySchema.default("monthly"),
	rate: optionalCurrencySchema.optional().default(null),
	depositAmount: optionalCurrencySchema.optional().default(null),
	contractStartDate: isoDateSchema.optional().or(z.literal("")).transform((value) => value || null),
	operationalStartDate: isoDateSchema.optional().or(z.literal("")).transform((value) => value || null),
	endDate: isoDateSchema.optional().or(z.literal("")).transform((value) => value || null),
	requestSummary: z.string().trim().max(2000).optional().default(""),
	requestedTrailerCount: z
		.union([z.coerce.number().int().positive(), z.literal(""), z.null(), z.undefined()])
		.transform((value) => (typeof value === "number" ? value : null)),
	requestedTrailerType: z.string().trim().max(120).optional().default(""),
	trailerIds: z.array(z.string().uuid()).optional().default([]),
});

export const adminRentalUpdateSchema = z.object({
	action: z
		.enum([
			"save",
			"send_proposal",
			"resend_proposal",
			"approve_request",
			"deny_request",
			"cancel_request",
		])
		.default("save"),
	tenantId: z.string().uuid().optional().or(z.literal("")).transform((value) => value || undefined),
	status: rentalStatusSchema.optional(),
	billingStatus: billingStatusSchema.optional(),
	billingFrequency: billingFrequencySchema.optional(),
	rate: optionalCurrencySchema.optional(),
	depositAmount: optionalCurrencySchema.optional(),
	contractStartDate: isoDateSchema.optional().or(z.literal("")).transform((value) => value || null),
	operationalStartDate: isoDateSchema.optional().or(z.literal("")).transform((value) => value || null),
	endDate: isoDateSchema.optional().or(z.literal("")).transform((value) => value || null),
	requestSummary: z.string().trim().max(2000).optional(),
	requestedTrailerCount: z
		.union([z.coerce.number().int().positive(), z.literal(""), z.undefined()])
		.transform((value) => (typeof value === "number" ? value : undefined)),
	requestedTrailerType: z.string().trim().max(120).optional(),
	trailerIds: z.array(z.string().uuid()).optional().default([]),
});

export const tenantRentalModificationSchema = z.object({
	billingFrequency: billingFrequencySchema.optional(),
	contractStartDate: isoDateSchema.optional().or(z.literal("")).transform((value) => value || null),
	endDate: isoDateSchema.optional().or(z.literal("")).transform((value) => value || null),
	requestedTrailerCount: z
		.union([z.coerce.number().int().positive(), z.literal(""), z.null(), z.undefined()])
		.transform((value) => (typeof value === "number" ? value : null)),
	requestedTrailerType: z.string().trim().max(120).optional().default(""),
	requestSummary: z.string().trim().max(2000).optional().default(""),
});

export const adminTrailerCreateSchema = z.object({
	trailerCode: z.string().trim().max(80).optional().default(""),
	trailerType: z.string().trim().min(1, "Trailer type is required.").max(120),
	plateNumber: z.string().trim().max(40).optional().default(""),
	vin: z.string().trim().max(80).optional().default(""),
	status: trailerStatusSchema.default("available"),
	rentalId: z.string().uuid().optional().or(z.literal("")).transform((value) => value || null),
});

export const adminTrailerUpdateSchema = z.object({
	trailerCode: z.string().trim().max(80).optional(),
	trailerType: z.string().trim().min(1).max(120).optional(),
	plateNumber: z.string().trim().max(40).optional(),
	vin: z.string().trim().max(80).optional(),
	status: trailerStatusSchema.optional(),
});
