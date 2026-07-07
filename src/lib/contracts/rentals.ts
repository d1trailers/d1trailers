import { z } from "zod";
import {
	TRAILER_TYPE_VALUES,
	normalizeTrailerType,
} from "@/lib/trailerTypes";

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
export type TrailerType = (typeof TRAILER_TYPE_VALUES)[number];
export type RentalRecordKind = (typeof RENTAL_RECORD_KIND_VALUES)[number];
export type RentalRequestKind = (typeof RENTAL_REQUEST_KIND_VALUES)[number];
export type RentalRequestOutcome = (typeof RENTAL_REQUEST_OUTCOME_VALUES)[number];
export type TenantRequestKind = (typeof TENANT_REQUEST_KIND_VALUES)[number];

export const billingFrequencySchema = z.enum(BILLING_FREQUENCY_VALUES);
export const rentalStatusSchema = z.enum(RENTAL_STATUS_VALUES);
export const billingStatusSchema = z.enum(BILLING_STATUS_VALUES);
export const trailerStatusSchema = z.enum(TRAILER_STATUS_VALUES);
export const trailerTypeSchema = z.preprocess(
	(value) => normalizeTrailerType(value) ?? value,
	z.enum(TRAILER_TYPE_VALUES),
);
const requestedTrailerTypeLineSchema = z.object({
	trailerType: trailerTypeSchema,
	quantity: z.coerce.number().int().positive("Trailer quantity must be at least 1."),
});
const requestedTrailerTypesSchema = z
	.array(requestedTrailerTypeLineSchema)
	.min(1, "Add at least one requested trailer type.")
	.transform((items) => {
		const counts = new Map<string, number>();
		for (const item of items) {
			counts.set(item.trailerType, (counts.get(item.trailerType) ?? 0) + item.quantity);
		}
		return [...counts.entries()].map(([trailerType, quantity]) => ({
			trailerType,
			quantity,
		}));
	});
export const rentalRecordKindSchema = z.enum(RENTAL_RECORD_KIND_VALUES);
export const rentalRequestKindSchema = z.enum(RENTAL_REQUEST_KIND_VALUES);
export const rentalRequestOutcomeSchema = z.enum(RENTAL_REQUEST_OUTCOME_VALUES);
export const tenantRequestKindSchema = z.enum(TENANT_REQUEST_KIND_VALUES);

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const optionalDateSchema = isoDateSchema.optional().or(z.literal("")).transform((value) => value || null);
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

function compareIsoDates(left?: string | null, right?: string | null) {
	if (!left || !right) return 0;
	return left.localeCompare(right);
}

function dateOrderMessage(path: string[], message: string) {
	return {
		path,
		message,
	};
}

export const rentalRequestCreateSchema = z
	.object({
		requestType: tenantRequestKindSchema,
		parentRentalId: z.string().uuid().optional().or(z.literal("")).transform((value) => value || null),
		requestedTrailerTypes: requestedTrailerTypesSchema,
		contractStartDate: isoDateSchema,
		operationalStartDate: isoDateSchema,
		endDate: isoDateSchema,
		billingFrequency: billingFrequencySchema.default("monthly"),
		requestSummary: z.string().trim().max(2000).optional().default(""),
	})
	.refine(
		(value) => compareIsoDates(value.contractStartDate, value.operationalStartDate) <= 0,
		dateOrderMessage(
			["operationalStartDate"],
			"Operational start date must be on or after the contract start date.",
		),
	)
	.refine(
		(value) => compareIsoDates(value.operationalStartDate, value.endDate) <= 0,
		dateOrderMessage(
			["endDate"],
			"End date must be on or after the operational start date.",
		),
	);

export const adminRentalCreateSchema = z.object({
	tenantId: z.string().uuid(),
	status: rentalStatusSchema.default("draft"),
	billingStatus: billingStatusSchema.default("draft"),
	billingFrequency: billingFrequencySchema.default("monthly"),
	rate: optionalCurrencySchema.optional().default(null),
	depositAmount: optionalCurrencySchema.optional().default(null),
	contractStartDate: optionalDateSchema,
	operationalStartDate: optionalDateSchema,
	endDate: optionalDateSchema,
	requestSummary: z.string().trim().max(2000).optional().default(""),
	requestedTrailerTypes: requestedTrailerTypesSchema.optional().default([
		{ trailerType: "flatbed", quantity: 1 },
	]),
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
	contractStartDate: optionalDateSchema,
	operationalStartDate: optionalDateSchema,
	endDate: optionalDateSchema,
	requestSummary: z.string().trim().max(2000).optional(),
	requestedTrailerTypes: requestedTrailerTypesSchema.optional(),
	trailerIds: z.array(z.string().uuid()).optional().default([]),
});

export const tenantRentalModificationSchema = z
	.object({
		billingFrequency: billingFrequencySchema.optional(),
		contractStartDate: optionalDateSchema,
		operationalStartDate: optionalDateSchema,
		endDate: optionalDateSchema,
		requestedTrailerTypes: requestedTrailerTypesSchema,
		requestSummary: z.string().trim().max(2000).optional().default(""),
	})
	.refine(
		(value) => compareIsoDates(value.contractStartDate, value.operationalStartDate) <= 0,
		dateOrderMessage(
			["operationalStartDate"],
			"Operational start date must be on or after the contract start date.",
		),
	)
	.refine(
		(value) => compareIsoDates(value.operationalStartDate, value.endDate) <= 0,
		dateOrderMessage(
			["endDate"],
			"End date must be on or after the operational start date.",
		),
	);

export const adminTrailerCreateSchema = z.object({
	trailerCode: z.string().trim().max(80).optional().default(""),
	trailerType: trailerTypeSchema,
	plateNumber: z.string().trim().max(40).optional().default(""),
	vin: z.string().trim().max(80).optional().default(""),
	status: trailerStatusSchema.default("available"),
	rentalId: z.string().uuid().optional().or(z.literal("")).transform((value) => value || null),
});

export const adminTrailerUpdateSchema = z.object({
	trailerCode: z.string().trim().max(80).optional(),
	trailerType: trailerTypeSchema.optional(),
	plateNumber: z.string().trim().max(40).optional(),
	vin: z.string().trim().max(80).optional(),
	status: trailerStatusSchema.optional(),
});
