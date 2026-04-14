import Airtable from "airtable";
// TEMPORARY: Re-enable this import once a valid STRIPE_SECRET_KEY is available.
// import { ensureStripeBillingRecords } from "@/lib/stripe";

const PORTAL_ELIGIBLE_STATUSES = new Set(["Active", "Past Due", "Suspended"]);

const AIRTABLE_SCHEMA = {
	TABLES: {
		CUSTOMERS: "Customers",
		RENTALS: "Rentals",
		TRAILERS: "Trailers",
		DOCUMENTS: "Documents",
		ASSINGMENTS: "Assingments",
	},
	FIELDS: {
		CUSTOMERS: {
			ID: "Customer ID",
			COMPANY_NAME: "Company Name",
			PRIMARY_EMAIL: "Primary Email",
			STATUS: "Status",
			STRIPE_CUSTOMER_ID: "Stripe Customer ID",
			RENTALS: "Rentals",
			APPLICATION_INTAKE_SUMMARY: "Application Intake Summary",
			DECISION_BY: "Decision By",
			REVIEW_NOTES: "Review Notes",
			REVIEWED_AT: "Reviewed At",
			SUBMITTED_AT: "Submitted At",
			DOCUMENTS: "Documents",
		},
		RENTALS: {
			ID: "Rental ID",
			CUSTOMER: "Customer",
			TRAILER: "Trailer",
			CONTRACT_START_DATE: "Contract Start Date",
			OPERATIONAL_START_DATE: "Operational Start Date",
			END_DATE: "End Date",
			STATUS: "Status",
			BILLING_FREQUENCY: "Billing Frequency",
			DEPOSIT_AMOUNT: "Deposit Amount",
			RATE: "Rate",
			STRIPE_SUBSCRIPTION_ID: "Stripe Subscription ID",
			STRIPE_PRICE_ID: "Stripe Price ID",
			STRIPE_PRODUCT_ID: "Stripe Product ID",
			CURRENT_PERIOD_END: "Current Period End",
			LAST_INVOICE_ID: "Last Invoice ID",
			BILLING_STATUS: "Billing Status",
			DOCUMENTS: "Documents",
			ASSINGMENTS: "Assingments",
		},
		TRAILERS: {
			ID: "Trailer ID",
			TRAILER_TYPE: "Trailer Type",
			PLATE_NUMBER: "Plate Number",
			VIN: "VIN",
			STATUS: "Status",
		},
		DOCUMENTS: {
			ID: "Document ID",
			CUSTOMER: "Customer",
			RENTAL: "Rental",
			CATEGORY: "Category",
			TYPE: "Type",
			ATTACHMENT: "Attachment",
			UPLOADED_AT: "Uploaded At",
		},
		ASSINGMENTS: {
			ID: "Assingment ID",
			RENTAL: "Rental",
			TRAILER: "Trailer",
			START_DATE: "Start Date",
			END_DATE: "End Date",
			STATUS: "Status",
			NOTES: "Notes",
		},
	},
};

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;
const base =
	apiKey && baseId
		? new Airtable({
				apiKey,
			}).base(baseId)
		: null;

function assertBase() {
	if (!base) {
		throw new Error("Airtable is not configured");
	}
}

function normalizeEmail(email) {
	return String(email ?? "").trim().toLowerCase();
}

function escapeFormulaValue(value) {
	return String(value ?? "")
		.replace(/\\/g, "\\\\")
		.replace(/'/g, "\\'");
}

function safeLinkedIds(value) {
	return Array.isArray(value) ? value.filter(Boolean) : [];
}

function formulaOrFromRecordIds(recordIds) {
	const ids = Array.from(new Set(recordIds.filter(Boolean)));
	if (!ids.length) return null;

	const conditions = ids.map(
		(recordId) => `RECORD_ID() = '${escapeFormulaValue(recordId)}'`
	);
	return conditions.length === 1 ? conditions[0] : `OR(${conditions.join(",")})`;
}

function formulaOrFindInLinkedField(recordIds, linkedFieldName) {
	const ids = Array.from(new Set(recordIds.filter(Boolean)));
	if (!ids.length) return null;

	const conditions = ids.map(
		(recordId) =>
			`FIND('${escapeFormulaValue(recordId)}', ARRAYJOIN({${linkedFieldName}}))`
	);
	return conditions.length === 1 ? conditions[0] : `OR(${conditions.join(",")})`;
}

function formulaOrFromStatuses(fieldName, statuses) {
	const safeStatuses = Array.from(new Set((statuses ?? []).filter(Boolean)));
	if (!safeStatuses.length) return null;

	const conditions = safeStatuses.map(
		(status) => `{${fieldName}} = '${escapeFormulaValue(status)}'`
	);
	return conditions.length === 1 ? conditions[0] : `OR(${conditions.join(",")})`;
}

function combineFormulasWithAnd(formulas) {
	const safeFormulas = (Array.isArray(formulas) ? formulas : []).filter(Boolean);
	if (!safeFormulas.length) return null;
	return safeFormulas.length === 1 ? safeFormulas[0] : `AND(${safeFormulas.join(",")})`;
}

function normalizeAttachments(value) {
	const attachments = Array.isArray(value) ? value : [];
	return attachments
		.map((attachment) => ({
			url: attachment?.url ?? null,
			filename: attachment?.filename ?? null,
			type: attachment?.type ?? null,
			size: attachment?.size ?? null,
		}))
		.filter((attachment) => Boolean(attachment.url));
}

function normalizeCustomerRecord(record) {
	if (!record) return null;

	return {
		id: record.get(AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.ID) ?? record.id,
		recordId: record.id,
		companyName:
			record.get(AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.COMPANY_NAME) ?? null,
		primaryEmail:
			record.get(AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.PRIMARY_EMAIL) ?? null,
		status: record.get(AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.STATUS) ?? null,
		stripeCustomerId:
			record.get(AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.STRIPE_CUSTOMER_ID) ?? null,
		rentalRecordIds: safeLinkedIds(
			record.get(AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.RENTALS)
		),
		decisionBy:
			record.get(AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.DECISION_BY) ?? null,
		applicationIntakeSummary:
			record.get(AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.APPLICATION_INTAKE_SUMMARY) ??
			null,
		reviewNotes:
			record.get(AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.REVIEW_NOTES) ?? null,
		reviewedAt:
			record.get(AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.REVIEWED_AT) ?? null,
		submittedAt:
			record.get(AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.SUBMITTED_AT) ?? null,
		documentRecordIds: safeLinkedIds(
			record.get(AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.DOCUMENTS)
		),
	};
}

function normalizeRentalRecord(record) {
	return {
		id: record.get(AIRTABLE_SCHEMA.FIELDS.RENTALS.ID) ?? record.id,
		recordId: record.id,
		status: record.get(AIRTABLE_SCHEMA.FIELDS.RENTALS.STATUS) ?? null,
		contractStartDate:
			record.get(AIRTABLE_SCHEMA.FIELDS.RENTALS.CONTRACT_START_DATE) ?? null,
		operationalStartDate:
			record.get(AIRTABLE_SCHEMA.FIELDS.RENTALS.OPERATIONAL_START_DATE) ?? null,
		endDate: record.get(AIRTABLE_SCHEMA.FIELDS.RENTALS.END_DATE) ?? null,
		billingFrequency:
			record.get(AIRTABLE_SCHEMA.FIELDS.RENTALS.BILLING_FREQUENCY) ?? null,
		depositAmount:
			record.get(AIRTABLE_SCHEMA.FIELDS.RENTALS.DEPOSIT_AMOUNT) ?? null,
		rate: record.get(AIRTABLE_SCHEMA.FIELDS.RENTALS.RATE) ?? null,
		currentPeriodEnd:
			record.get(AIRTABLE_SCHEMA.FIELDS.RENTALS.CURRENT_PERIOD_END) ?? null,
		billingStatus:
			record.get(AIRTABLE_SCHEMA.FIELDS.RENTALS.BILLING_STATUS) ?? null,
		stripe: {
			subscriptionId:
				record.get(AIRTABLE_SCHEMA.FIELDS.RENTALS.STRIPE_SUBSCRIPTION_ID) ?? null,
			priceId: record.get(AIRTABLE_SCHEMA.FIELDS.RENTALS.STRIPE_PRICE_ID) ?? null,
			productId:
				record.get(AIRTABLE_SCHEMA.FIELDS.RENTALS.STRIPE_PRODUCT_ID) ?? null,
			lastInvoiceId:
				record.get(AIRTABLE_SCHEMA.FIELDS.RENTALS.LAST_INVOICE_ID) ?? null,
		},
		customerRecordIds: safeLinkedIds(
			record.get(AIRTABLE_SCHEMA.FIELDS.RENTALS.CUSTOMER)
		),
		trailerRecordIds: safeLinkedIds(
			record.get(AIRTABLE_SCHEMA.FIELDS.RENTALS.TRAILER)
		),
		assingmentRecordIds: safeLinkedIds(
			record.get(AIRTABLE_SCHEMA.FIELDS.RENTALS.ASSINGMENTS)
		),
		documentRecordIds: safeLinkedIds(
			record.get(AIRTABLE_SCHEMA.FIELDS.RENTALS.DOCUMENTS)
		),
	};
}

function normalizeTrailerRecord(record) {
	return {
		id: record.get(AIRTABLE_SCHEMA.FIELDS.TRAILERS.ID) ?? record.id,
		recordId: record.id,
		trailerType:
			record.get(AIRTABLE_SCHEMA.FIELDS.TRAILERS.TRAILER_TYPE) ?? null,
		plateNumber:
			record.get(AIRTABLE_SCHEMA.FIELDS.TRAILERS.PLATE_NUMBER) ?? null,
		vin: record.get(AIRTABLE_SCHEMA.FIELDS.TRAILERS.VIN) ?? null,
		status: record.get(AIRTABLE_SCHEMA.FIELDS.TRAILERS.STATUS) ?? null,
	};
}

function normalizeDocumentRecord(record) {
	return {
		id: record.get(AIRTABLE_SCHEMA.FIELDS.DOCUMENTS.ID) ?? record.id,
		recordId: record.id,
		category: record.get(AIRTABLE_SCHEMA.FIELDS.DOCUMENTS.CATEGORY) ?? null,
		type: record.get(AIRTABLE_SCHEMA.FIELDS.DOCUMENTS.TYPE) ?? null,
		uploadedAt: record.get(AIRTABLE_SCHEMA.FIELDS.DOCUMENTS.UPLOADED_AT) ?? null,
		attachments: normalizeAttachments(
			record.get(AIRTABLE_SCHEMA.FIELDS.DOCUMENTS.ATTACHMENT)
		),
		rentalRecordIds: safeLinkedIds(
			record.get(AIRTABLE_SCHEMA.FIELDS.DOCUMENTS.RENTAL)
		),
		customerRecordIds: safeLinkedIds(
			record.get(AIRTABLE_SCHEMA.FIELDS.DOCUMENTS.CUSTOMER)
		),
	};
}

function normalizeAssignmentRecord(record) {
	return {
		id: record.get(AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.ID) ?? record.id,
		recordId: record.id,
		startDate: record.get(AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.START_DATE) ?? null,
		endDate: record.get(AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.END_DATE) ?? null,
		status: record.get(AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.STATUS) ?? null,
		notes: record.get(AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.NOTES) ?? null,
		rentalRecordIds: safeLinkedIds(
			record.get(AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.RENTAL)
		),
		trailerRecordIds: safeLinkedIds(
			record.get(AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.TRAILER)
		),
	};
}

function publicDocumentView(document) {
	return {
		id: document.id,
		category: document.category,
		type: document.type,
		uploadedAt: document.uploadedAt,
		attachments: document.attachments,
	};
}

function publicTrailerView(trailer) {
	return {
		id: trailer.id,
		trailerType: trailer.trailerType,
		plateNumber: trailer.plateNumber,
		vin: trailer.vin,
		status: trailer.status,
	};
}

export function isPortalEligibleCustomerStatus(status) {
	return PORTAL_ELIGIBLE_STATUSES.has(status);
}

export async function getCustomerByPrimaryEmail(email) {
	assertBase();
	const normalizedEmail = normalizeEmail(email);
	if (!normalizedEmail) return null;

	const records = await base(AIRTABLE_SCHEMA.TABLES.CUSTOMERS)
		.select({
			filterByFormula: `LOWER({${AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.PRIMARY_EMAIL}}) = '${escapeFormulaValue(
				normalizedEmail
			)}'`,
			maxRecords: 1,
		})
		.firstPage();

	if (!records.length) return null;
	return normalizeCustomerRecord(records[0]);
}

export async function getCustomerByCustomerId(customerId) {
	assertBase();
	const normalizedCustomerId =
		typeof customerId === "string" ? customerId.trim() : "";
	if (!normalizedCustomerId) return null;

	const records = await base(AIRTABLE_SCHEMA.TABLES.CUSTOMERS)
		.select({
			filterByFormula: `{${AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.ID}} = '${escapeFormulaValue(
				normalizedCustomerId
			)}'`,
			maxRecords: 1,
		})
		.firstPage();

	if (!records.length) return null;
	return normalizeCustomerRecord(records[0]);
}

export async function getRentalsByCustomer(customerRecordId) {
	assertBase();
	if (!customerRecordId) return [];

	const records = await base(AIRTABLE_SCHEMA.TABLES.RENTALS)
		.select({
			filterByFormula: `FIND('${escapeFormulaValue(
				customerRecordId
			)}', ARRAYJOIN({${AIRTABLE_SCHEMA.FIELDS.RENTALS.CUSTOMER}}))`,
		})
		.all();

	return records.map(normalizeRentalRecord);
}

export async function getAssignmentsByRentalIds(rentalRecordIds) {
	assertBase();
	const filterByFormula = formulaOrFindInLinkedField(
		rentalRecordIds,
		AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.RENTAL
	);

	if (!filterByFormula) return [];

	const records = await base(AIRTABLE_SCHEMA.TABLES.ASSINGMENTS)
		.select({ filterByFormula })
		.all();

	return records.map(normalizeAssignmentRecord);
}

export async function getTrailersByIds(trailerRecordIds) {
	assertBase();
	const filterByFormula = formulaOrFromRecordIds(trailerRecordIds);
	if (!filterByFormula) return [];

	const records = await base(AIRTABLE_SCHEMA.TABLES.TRAILERS)
		.select({ filterByFormula })
		.all();

	return records.map(normalizeTrailerRecord);
}

export async function getCustomersByIds(customerRecordIds) {
	assertBase();
	const filterByFormula = formulaOrFromRecordIds(customerRecordIds);
	if (!filterByFormula) return [];

	const records = await base(AIRTABLE_SCHEMA.TABLES.CUSTOMERS)
		.select({ filterByFormula })
		.all();

	return records.map(normalizeCustomerRecord);
}

export async function getCustomersByStatuses(statuses) {
	assertBase();
	const filterByFormula = formulaOrFromStatuses(
		AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.STATUS,
		statuses
	);
	if (!filterByFormula) return [];

	const records = await base(AIRTABLE_SCHEMA.TABLES.CUSTOMERS)
		.select({ filterByFormula })
		.all();

	return records.map(normalizeCustomerRecord);
}

export async function getRentalsByStatuses(statuses) {
	assertBase();
	const filterByFormula = formulaOrFromStatuses(
		AIRTABLE_SCHEMA.FIELDS.RENTALS.STATUS,
		statuses
	);
	if (!filterByFormula) return [];

	const records = await base(AIRTABLE_SCHEMA.TABLES.RENTALS)
		.select({ filterByFormula })
		.all();

	return records.map(normalizeRentalRecord);
}

export async function getRentalsByIds(rentalRecordIds) {
	assertBase();
	const filterByFormula = formulaOrFromRecordIds(rentalRecordIds);
	if (!filterByFormula) return [];

	const records = await base(AIRTABLE_SCHEMA.TABLES.RENTALS)
		.select({ filterByFormula })
		.all();

	return records.map(normalizeRentalRecord);
}

export async function getCustomerByStripeCustomerId(stripeCustomerId) {
	assertBase();
	const normalizedStripeCustomerId =
		typeof stripeCustomerId === "string" ? stripeCustomerId.trim() : "";
	if (!normalizedStripeCustomerId) return null;

	const records = await base(AIRTABLE_SCHEMA.TABLES.CUSTOMERS)
		.select({
			filterByFormula: `{${AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.STRIPE_CUSTOMER_ID}} = '${escapeFormulaValue(
				normalizedStripeCustomerId
			)}'`,
			maxRecords: 1,
		})
		.firstPage();

	if (!records.length) return null;
	return normalizeCustomerRecord(records[0]);
}

export async function getRentalByStripeSubscriptionId(stripeSubscriptionId) {
	assertBase();
	const normalizedStripeSubscriptionId =
		typeof stripeSubscriptionId === "string" ? stripeSubscriptionId.trim() : "";
	if (!normalizedStripeSubscriptionId) return null;

	const records = await base(AIRTABLE_SCHEMA.TABLES.RENTALS)
		.select({
			filterByFormula: `{${AIRTABLE_SCHEMA.FIELDS.RENTALS.STRIPE_SUBSCRIPTION_ID}} = '${escapeFormulaValue(
				normalizedStripeSubscriptionId
			)}'`,
			maxRecords: 1,
		})
		.firstPage();

	if (!records.length) return null;
	return normalizeRentalRecord(records[0]);
}

export async function getRentalByLastInvoiceId(lastInvoiceId) {
	assertBase();
	const normalizedLastInvoiceId =
		typeof lastInvoiceId === "string" ? lastInvoiceId.trim() : "";
	if (!normalizedLastInvoiceId) return null;

	const records = await base(AIRTABLE_SCHEMA.TABLES.RENTALS)
		.select({
			filterByFormula: `{${AIRTABLE_SCHEMA.FIELDS.RENTALS.LAST_INVOICE_ID}} = '${escapeFormulaValue(
				normalizedLastInvoiceId
			)}'`,
			maxRecords: 1,
		})
		.firstPage();

	if (!records.length) return null;
	return normalizeRentalRecord(records[0]);
}

export async function getTrailersByStatuses(statuses) {
	assertBase();
	const filterByFormula = formulaOrFromStatuses(
		AIRTABLE_SCHEMA.FIELDS.TRAILERS.STATUS,
		statuses
	);
	if (!filterByFormula) return [];

	const records = await base(AIRTABLE_SCHEMA.TABLES.TRAILERS)
		.select({ filterByFormula })
		.all();

	return records.map(normalizeTrailerRecord);
}

export async function getAssignmentsByStatuses(statuses) {
	assertBase();
	const filterByFormula = formulaOrFromStatuses(
		AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.STATUS,
		statuses
	);
	if (!filterByFormula) return [];

	const records = await base(AIRTABLE_SCHEMA.TABLES.ASSINGMENTS)
		.select({ filterByFormula })
		.all();

	return records.map(normalizeAssignmentRecord);
}

export async function getAssignmentsByTrailerIds(
	trailerRecordIds,
	statuses = ACTIVE_ASSIGNMENT_STATUSES
) {
	assertBase();
	const linkedTrailerFormula = formulaOrFindInLinkedField(
		trailerRecordIds,
		AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.TRAILER
	);
	const statusFormula = formulaOrFromStatuses(
		AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.STATUS,
		statuses
	);
	const filterByFormula = combineFormulasWithAnd([
		linkedTrailerFormula,
		statusFormula,
	]);

	if (!filterByFormula) return [];

	const records = await base(AIRTABLE_SCHEMA.TABLES.ASSINGMENTS)
		.select({ filterByFormula })
		.all();

	return records.map(normalizeAssignmentRecord);
}

export async function getCustomerDocuments(customerRecordId) {
	assertBase();
	if (!customerRecordId) return [];

	const records = await base(AIRTABLE_SCHEMA.TABLES.DOCUMENTS)
		.select({
			filterByFormula: `FIND('${escapeFormulaValue(
				customerRecordId
			)}', ARRAYJOIN({${AIRTABLE_SCHEMA.FIELDS.DOCUMENTS.CUSTOMER}}))`,
		})
		.all();

	return records.map(normalizeDocumentRecord);
}

export async function getRentalDocuments(rentalRecordIds) {
	assertBase();
	const filterByFormula = formulaOrFindInLinkedField(
		rentalRecordIds,
		AIRTABLE_SCHEMA.FIELDS.DOCUMENTS.RENTAL
	);

	if (!filterByFormula) return [];

	const records = await base(AIRTABLE_SCHEMA.TABLES.DOCUMENTS)
		.select({ filterByFormula })
		.all();

	return records.map(normalizeDocumentRecord);
}

async function updateRecordById(tableName, recordId, fields) {
	assertBase();
	if (!recordId) {
		throw new ApplicationDecisionError("VALIDATION", "Record ID is required");
	}

	const sanitizedFields = sanitizeFieldsForUpdate(fields);
	if (!Object.keys(sanitizedFields).length) return null;

	return base(tableName).update(recordId, sanitizedFields);
}

async function createRecord(tableName, fields) {
	assertBase();
	const sanitizedFields = sanitizeFieldsForUpdate(fields);
	return base(tableName).create(sanitizedFields);
}

export function buildPortalContract(
	customer,
	rentals,
	assignments,
	trailers,
	documents
) {
	if (!customer) return null;

	const trailersByRecordId = new Map(
		(Array.isArray(trailers) ? trailers : []).map((trailer) => [
			trailer.recordId,
			trailer,
		])
	);

	const allDocuments = Array.isArray(documents) ? documents : [];
	const dedupedDocuments = Array.from(
		new Map(allDocuments.map((document) => [document.recordId, document])).values()
	);

	const assignmentsByRentalRecordId = new Map();
	for (const assignment of Array.isArray(assignments) ? assignments : []) {
		for (const rentalRecordId of assignment.rentalRecordIds) {
			const existing = assignmentsByRentalRecordId.get(rentalRecordId) ?? [];
			existing.push(assignment);
			assignmentsByRentalRecordId.set(rentalRecordId, existing);
		}
	}

	const documentsByRentalRecordId = new Map();
	for (const document of dedupedDocuments) {
		for (const rentalRecordId of document.rentalRecordIds) {
			const existing = documentsByRentalRecordId.get(rentalRecordId) ?? [];
			existing.push(publicDocumentView(document));
			documentsByRentalRecordId.set(rentalRecordId, existing);
		}
	}

	const normalizedRentals = (Array.isArray(rentals) ? rentals : []).map((rental) => {
		const rentalAssignments =
			assignmentsByRentalRecordId.get(rental.recordId) ?? [];

		const assignmentTrailers = rentalAssignments.flatMap(
			(assignment) => assignment.trailerRecordIds
		);
		const trailerRecordIds = Array.from(
			new Set([...rental.trailerRecordIds, ...assignmentTrailers])
		);

		const rentalTrailers = trailerRecordIds
			.map((recordId) => trailersByRecordId.get(recordId))
			.filter(Boolean)
			.map(publicTrailerView);

		const normalizedAssignments = rentalAssignments.map((assignment) => ({
			id: assignment.id,
			startDate: assignment.startDate,
			endDate: assignment.endDate,
			status: assignment.status,
			notes: assignment.notes,
			trailers: assignment.trailerRecordIds
				.map((recordId) => trailersByRecordId.get(recordId))
				.filter(Boolean)
				.map(publicTrailerView),
		}));

		return {
			id: rental.id,
			status: rental.status,
			billingFrequency: rental.billingFrequency,
			rate: rental.rate,
			depositAmount: rental.depositAmount,
			contractStartDate: rental.contractStartDate,
			operationalStartDate: rental.operationalStartDate,
			endDate: rental.endDate,
			billingStatus: rental.billingStatus,
			currentPeriodEnd: rental.currentPeriodEnd,
			stripe: rental.stripe,
			trailers: rentalTrailers,
			assignments: normalizedAssignments,
			documents: documentsByRentalRecordId.get(rental.recordId) ?? [],
		};
	});

	const customerLevelDocuments = dedupedDocuments
		.filter((document) => document.rentalRecordIds.length === 0)
		.map(publicDocumentView);

	return {
		customer: {
			id: customer.id,
			companyName: customer.companyName,
			primaryEmail: customer.primaryEmail,
			status: customer.status,
		},
		rentals: normalizedRentals,
		documents: customerLevelDocuments,
	};
}

export const ADMIN_APPLICATION_CUSTOMER_STATUSES = [
	"Submitted",
	"Review",
	"Needs Info",
	"Awaiting Payment",
];
export const ADMIN_ACTIVE_RENTAL_STATUSES = [
	"Active",
	"Awaiting First Payment",
	"Overdue",
];
export const ADMIN_WATCHLIST_CUSTOMER_STATUSES = ["Past Due", "Suspended"];
export const ADMIN_WATCHLIST_RENTAL_STATUSES = ["Overdue"];
export const ADMIN_INVENTORY_TRAILER_STATUSES = [
	"Available",
	"Reserved",
	"Rented",
	"Maintenance",
];
export const ADMIN_CUSTOMER_STATUS_OPTIONS = [
	"Submitted",
	"Review",
	"Needs Info",
	"Awaiting Payment",
	"Active",
	"Past Due",
	"Suspended",
	"Denied",
];
export const ADMIN_RENTAL_STATUS_OPTIONS = [
	"Submitted",
	"Needs Info",
	"Denied",
	"Awaiting First Payment",
	"Active",
	"Overdue",
	"Returned",
	"Cancelled",
];
export const ADMIN_TRAILER_STATUS_OPTIONS = [
	"Available",
	"Reserved",
	"Rented",
	"Maintenance",
];
export const ADMIN_BILLING_FREQUENCY_OPTIONS = ["Weekly", "Monthly", "Yearly"];
export const ADMIN_BILLING_STATUS_OPTIONS = [
	"Draft",
	"Awaiting First Payment",
	"Active",
	"Past Due",
	"Suspended",
	"Cancelled",
	"Unpaid",
];
const APPLICATION_REVIEW_CUSTOMER_STATUSES = new Set([
	"Submitted",
	"Review",
	"Needs Info",
	"Awaiting Payment",
]);
const APPLICATION_REVIEW_RENTAL_STATUSES = new Set([
	"Submitted",
	"Needs Info",
	"Awaiting First Payment",
]);
const ACTIVE_ASSIGNMENT_STATUSES = ["Active"];
const RENTAL_STATUS_CANCELLED = "Cancelled";

const APPLICATION_DECISION_ACTIONS = {
	APPROVE: "approve",
	DENY: "deny",
	REQUEST_INFO: "request_info",
};

const APPLICATION_DECISION_OUTCOME = {
	[APPLICATION_DECISION_ACTIONS.APPROVE]: {
		customerStatus: "Awaiting Payment",
		rentalStatus: "Awaiting First Payment",
	},
	[APPLICATION_DECISION_ACTIONS.DENY]: {
		customerStatus: "Denied",
		rentalStatus: RENTAL_STATUS_CANCELLED,
	},
	[APPLICATION_DECISION_ACTIONS.REQUEST_INFO]: {
		customerStatus: "Needs Info",
		rentalStatus: "Needs Info",
	},
};

export class ApplicationDecisionError extends Error {
	constructor(code, message) {
		super(message);
		this.name = "ApplicationDecisionError";
		this.code = code;
	}
}

function sanitizeFieldsForUpdate(fields) {
	return Object.fromEntries(
		Object.entries(fields).filter(([, value]) => value !== undefined)
	);
}

function normalizeDateOnlyValue(value) {
	if (typeof value !== "string" || !value.trim()) return null;
	const trimmed = value.trim();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
	const parsed = new Date(`${trimmed}T00:00:00.000Z`);
	if (Number.isNaN(parsed.getTime())) return null;
	return trimmed;
}

function normalizeCurrencyValue(value) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim()) {
		const parsed = Number(value.trim());
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}

function normalizeRecordIdList(value) {
	if (Array.isArray(value)) {
		return Array.from(
			new Set(
				value
					.map((entry) => (typeof entry === "string" ? entry.trim() : ""))
					.filter(Boolean)
			)
		);
	}

	if (typeof value === "string" && value.trim()) {
		return [value.trim()];
	}

	return [];
}

function normalizeBillingFrequencyValue(value) {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return ADMIN_BILLING_FREQUENCY_OPTIONS.includes(trimmed) ? trimmed : null;
}

function normalizeBillingStatusValue(value) {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (ADMIN_BILLING_STATUS_OPTIONS.includes(trimmed)) {
		return trimmed;
	}

	switch (trimmed.toLowerCase()) {
		case "active":
		case "trialing":
			return "Active";
		case "past_due":
			return "Past Due";
		case "paused":
			return "Suspended";
		case "canceled":
			return "Cancelled";
		case "unpaid":
		case "incomplete_expired":
			return "Unpaid";
		case "incomplete":
			return "Awaiting First Payment";
		case "draft":
			return "Draft";
		default:
			return null;
	}
}

function normalizeDateOnlyFromUnixTimestamp(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) return null;
	return new Date(value * 1000).toISOString().slice(0, 10);
}

function extractStripeObject(eventPayload) {
	return typeof eventPayload?.data?.object === "object" && eventPayload?.data?.object
		? eventPayload.data.object
		: null;
}

function extractStripeSubscriptionId(stripeObject) {
	if (!stripeObject || typeof stripeObject !== "object") return null;
	if (typeof stripeObject.subscription === "string" && stripeObject.subscription.trim()) {
		return stripeObject.subscription.trim();
	}
	if (typeof stripeObject.id === "string" && stripeObject.object === "subscription") {
		return stripeObject.id.trim();
	}
	if (
		typeof stripeObject.subscription?.id === "string" &&
		stripeObject.subscription.id.trim()
	) {
		return stripeObject.subscription.id.trim();
	}
	return null;
}

function extractStripeInvoiceId(stripeObject) {
	if (!stripeObject || typeof stripeObject !== "object") return null;
	if (typeof stripeObject.id === "string" && stripeObject.object === "invoice") {
		return stripeObject.id.trim();
	}
	if (typeof stripeObject.latest_invoice === "string" && stripeObject.latest_invoice.trim()) {
		return stripeObject.latest_invoice.trim();
	}
	if (
		typeof stripeObject.latest_invoice?.id === "string" &&
		stripeObject.latest_invoice.id.trim()
	) {
		return stripeObject.latest_invoice.id.trim();
	}
	return null;
}

function extractStripeCustomerId(stripeObject) {
	if (!stripeObject || typeof stripeObject !== "object") return null;
	if (typeof stripeObject.customer === "string" && stripeObject.customer.trim()) {
		return stripeObject.customer.trim();
	}
	if (typeof stripeObject.customer_details?.email === "string") {
		return null;
	}
	return null;
}

function extractStripeCurrentPeriodEnd(stripeObject) {
	if (!stripeObject || typeof stripeObject !== "object") return null;
	if (typeof stripeObject.current_period_end === "number") {
		return normalizeDateOnlyFromUnixTimestamp(stripeObject.current_period_end);
	}
	if (typeof stripeObject.period_end === "number") {
		return normalizeDateOnlyFromUnixTimestamp(stripeObject.period_end);
	}
	const linePeriodEnd = stripeObject.lines?.data?.[0]?.period?.end;
	if (typeof linePeriodEnd === "number") {
		return normalizeDateOnlyFromUnixTimestamp(linePeriodEnd);
	}
	return null;
}

async function getOperationalTrailerRecordIdsForRental(rental) {
	const rentalAssignments = (
		await getAssignmentsByRentalIds([rental.recordId])
	).filter((assignment) => assignment.status === "Active");
	return Array.from(
		new Set([
			...rental.trailerRecordIds,
			...rentalAssignments.flatMap((assignment) => assignment.trailerRecordIds),
		])
	);
}

async function updateTrailerStatusesForRental(rental, nextStatus) {
	const trailerRecordIds = await getOperationalTrailerRecordIdsForRental(rental);
	for (const trailerRecordId of trailerRecordIds) {
		await updateRecordById(AIRTABLE_SCHEMA.TABLES.TRAILERS, trailerRecordId, {
			[AIRTABLE_SCHEMA.FIELDS.TRAILERS.STATUS]: nextStatus,
		});
	}
	return trailerRecordIds;
}

async function applyBillingUpdateToRental({
	rental,
	customer,
	billingStatus,
	rentalStatus,
	customerStatus,
	currentPeriodEnd,
	lastInvoiceId,
	releaseTrailers = false,
	setTrailersToRented = false,
}) {
	const rentalUpdateFields = sanitizeFieldsForUpdate({
		[AIRTABLE_SCHEMA.FIELDS.RENTALS.BILLING_STATUS]: billingStatus || undefined,
		[AIRTABLE_SCHEMA.FIELDS.RENTALS.CURRENT_PERIOD_END]: currentPeriodEnd || undefined,
		[AIRTABLE_SCHEMA.FIELDS.RENTALS.LAST_INVOICE_ID]: lastInvoiceId || undefined,
		[AIRTABLE_SCHEMA.FIELDS.RENTALS.STATUS]: rentalStatus || undefined,
	});

	await updateRecordById(
		AIRTABLE_SCHEMA.TABLES.RENTALS,
		rental.recordId,
		rentalUpdateFields
	);

	if (customer?.recordId && customerStatus) {
		await updateRecordById(AIRTABLE_SCHEMA.TABLES.CUSTOMERS, customer.recordId, {
			[AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.STATUS]: customerStatus,
		});
	}

	if (releaseTrailers) {
		await updateRecordById(AIRTABLE_SCHEMA.TABLES.RENTALS, rental.recordId, {
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.TRAILER]: [],
		});
		await expireAssignmentsByRentalRecordId(
			rental.recordId,
			"Released from Stripe billing lifecycle event."
		);
	}

	if (setTrailersToRented) {
		await updateTrailerStatusesForRental(rental, "Rented");
	}
}

function summarizeTrailersByStatus(trailers) {
	return ADMIN_INVENTORY_TRAILER_STATUSES.reduce((acc, status) => {
		acc[status] = trailers.filter((trailer) => trailer.status === status).length;
		return acc;
	}, {});
}

function enrichRentalsForAdmin(rentals, customers, trailers, assignments = []) {
	const customersByRecordId = new Map(
		customers.map((customer) => [customer.recordId, customer])
	);
	const trailersByRecordId = new Map(
		trailers.map((trailer) => [trailer.recordId, trailer])
	);
	const assignmentsByRentalRecordId =
		groupAssignmentsByRentalRecordId(assignments);

	return rentals.map((rental) => {
		const customerNames = rental.customerRecordIds
			.map((recordId) => customersByRecordId.get(recordId)?.companyName)
			.filter(Boolean);

		const rentalAssignments =
			assignmentsByRentalRecordId.get(rental.recordId) ?? [];
		const trailerRecordIds = Array.from(
			new Set([
				...rental.trailerRecordIds,
				...rentalAssignments.flatMap((assignment) => assignment.trailerRecordIds),
			])
		);
		const rentalTrailers = trailerRecordIds
			.map((recordId) => trailersByRecordId.get(recordId))
			.filter(Boolean)
			.map(publicTrailerView);

		return {
			rentalId: rental.id,
			recordId: rental.recordId,
			customerName: customerNames[0] ?? "Unknown Customer",
			status: rental.status,
			billingFrequency: rental.billingFrequency,
			rate: rental.rate,
			depositAmount: rental.depositAmount,
			currentPeriodEnd: rental.currentPeriodEnd,
			billingStatus: rental.billingStatus,
			trailers: rentalTrailers,
			assignments: rentalAssignments.map((assignment) =>
				mapAdminAssignment(assignment, trailersByRecordId)
			),
			activeAssignmentCount: rentalAssignments.filter(
				(assignment) => assignment.status === "Active"
			).length,
		};
	});
}

export async function getAdminApplicationsData() {
	const customers = await getCustomersByStatuses(ADMIN_APPLICATION_CUSTOMER_STATUSES);

	return customers.map((customer) => ({
		customerId: customer.id,
		companyName: customer.companyName,
		primaryEmail: customer.primaryEmail,
		status: customer.status,
		submittedAt: customer.submittedAt,
		reviewedAt: customer.reviewedAt,
		reviewNotes: customer.reviewNotes,
	}));
}

function dedupeByRecordId(records) {
	return Array.from(
		new Map((Array.isArray(records) ? records : []).map((item) => [item.recordId, item]))
			.values()
	);
}

function groupDocumentsByRentalRecordId(documents) {
	const documentsByRentalRecordId = new Map();

	for (const document of documents) {
		for (const rentalRecordId of document.rentalRecordIds) {
			const existing = documentsByRentalRecordId.get(rentalRecordId) ?? [];
			existing.push(publicDocumentView(document));
			documentsByRentalRecordId.set(rentalRecordId, existing);
		}
	}

	return documentsByRentalRecordId;
}

function groupAssignmentsByRentalRecordId(assignments) {
	const assignmentsByRentalRecordId = new Map();

	for (const assignment of assignments) {
		for (const rentalRecordId of assignment.rentalRecordIds) {
			const existing = assignmentsByRentalRecordId.get(rentalRecordId) ?? [];
			existing.push(assignment);
			assignmentsByRentalRecordId.set(rentalRecordId, existing);
		}
	}

	return assignmentsByRentalRecordId;
}

function groupAssignmentsByTrailerRecordId(assignments) {
	const assignmentsByTrailerRecordId = new Map();

	for (const assignment of assignments) {
		for (const trailerRecordId of assignment.trailerRecordIds) {
			const existing = assignmentsByTrailerRecordId.get(trailerRecordId) ?? [];
			existing.push(assignment);
			assignmentsByTrailerRecordId.set(trailerRecordId, existing);
		}
	}

	return assignmentsByTrailerRecordId;
}

function normalizeTimelineDate(value) {
	if (!value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dateRangesOverlap(startA, endA, startB, endB) {
	const normalizedStartA = normalizeTimelineDate(startA);
	const normalizedStartB = normalizeTimelineDate(startB);

	if (!normalizedStartA || !normalizedStartB) return true;

	const normalizedEndA = normalizeTimelineDate(endA);
	const normalizedEndB = normalizeTimelineDate(endB);
	const effectiveEndA = normalizedEndA ?? new Date("9999-12-31T00:00:00.000Z");
	const effectiveEndB = normalizedEndB ?? new Date("9999-12-31T00:00:00.000Z");

	return normalizedStartA <= effectiveEndB && normalizedStartB <= effectiveEndA;
}

function findTrailerAssignmentConflicts(assignments, trailerRecordId, targetRentalRecordId, startDate, endDate) {
	return (Array.isArray(assignments) ? assignments : []).filter((assignment) => {
		if (!assignment.trailerRecordIds.includes(trailerRecordId)) return false;
		if (assignment.rentalRecordIds.includes(targetRentalRecordId)) return false;
		if (assignment.status !== "Active") return false;

		return dateRangesOverlap(
			assignment.startDate,
			assignment.endDate,
			startDate,
			endDate
		);
	});
}

async function syncTrailerStatusForAvailability(trailerRecordId) {
	if (!trailerRecordId) return;

	const activeAssignments = await getAssignmentsByTrailerIds(
		[trailerRecordId],
		ACTIVE_ASSIGNMENT_STATUSES
	);
	const nextStatus = activeAssignments.length ? "Reserved" : "Available";

	await updateRecordById(AIRTABLE_SCHEMA.TABLES.TRAILERS, trailerRecordId, {
		[AIRTABLE_SCHEMA.FIELDS.TRAILERS.STATUS]: nextStatus,
	});
}

function mapAdminTrailerOption(trailer) {
	return {
		recordId: trailer.recordId,
		trailerId: trailer.id,
		trailerType: trailer.trailerType,
		plateNumber: trailer.plateNumber,
		vin: trailer.vin,
		status: trailer.status,
	};
}

function mapAdminAssignment(assignment, trailersByRecordId) {
	return {
		assignmentId: assignment.id,
		recordId: assignment.recordId,
		startDate: assignment.startDate,
		endDate: assignment.endDate,
		status: assignment.status,
		notes: assignment.notes,
		trailers: assignment.trailerRecordIds
			.map((recordId) => trailersByRecordId.get(recordId))
			.filter(Boolean)
			.map(mapAdminTrailerOption),
	};
}

function selectDecisionTargetRental(rentals) {
	const rentalList = Array.isArray(rentals) ? rentals : [];
	if (!rentalList.length) return null;

	const reviewableRental = rentalList.find((rental) =>
		APPLICATION_REVIEW_RENTAL_STATUSES.has(rental.status)
	);

	return reviewableRental ?? rentalList[0];
}

function getStatusTransitionSummary(entityType, nextStatus) {
	if (entityType === "customer") {
		if (nextStatus === "Denied") {
			return {
				risk: "high",
				message: "This may close out the application and remove it from active review queues.",
			};
		}
		if (nextStatus === "Suspended") {
			return {
				risk: "high",
				message: "This can block portal access for the customer until the status is restored.",
			};
		}
		if (nextStatus === "Active") {
			return {
				risk: "medium",
				message: "This restores portal eligibility and treats the customer as operationally active.",
			};
		}
	}

	if (entityType === "rental") {
		if (nextStatus === "Returned" || nextStatus === RENTAL_STATUS_CANCELLED) {
			return {
				risk: "high",
				message: "This will expire active assignments and release reserved trailers tied to the rental.",
			};
		}
		if (nextStatus === "Active") {
			return {
				risk: "medium",
				message: "This marks the rental live. Reserved trailers remain linked and billing-facing status should be reviewed.",
			};
		}
	}

	if (entityType === "trailer") {
		if (nextStatus === "Available") {
			return {
				risk: "high",
				message: "This can release the trailer from current reservations if active assignments are expired first.",
			};
		}
		if (nextStatus === "Maintenance") {
			return {
				risk: "high",
				message: "This may interrupt active operational assignments and should only be used after review.",
			};
		}
	}

	return {
		risk: "medium",
		message: "Review linked records before applying this status change.",
	};
}

export async function getAdminApplicationDetailsByCustomerId(customerId) {
	const customer = await getCustomerByCustomerId(customerId);
	if (!customer) return null;

	const rentals = await getRentalsByCustomer(customer.recordId);
	const rentalRecordIds = rentals.map((rental) => rental.recordId);

	const [assignments, customerDocuments, rentalDocuments] = await Promise.all([
		getAssignmentsByRentalIds(rentalRecordIds),
		getCustomerDocuments(customer.recordId),
		getRentalDocuments(rentalRecordIds),
	]);

	const allDocuments = dedupeByRecordId([...customerDocuments, ...rentalDocuments]);
	const allAssignments = dedupeByRecordId(assignments);

	const trailerRecordIds = Array.from(
		new Set([
			...rentals.flatMap((rental) => rental.trailerRecordIds),
			...allAssignments.flatMap((assignment) => assignment.trailerRecordIds),
		])
	);

	const [linkedTrailers, availableTrailers] = await Promise.all([
		getTrailersByIds(trailerRecordIds),
		getTrailersByStatuses(["Available"]),
	]);

	const trailersByRecordId = new Map(
		linkedTrailers.map((trailer) => [trailer.recordId, trailer])
	);
	const documentsByRentalRecordId = groupDocumentsByRentalRecordId(allDocuments);
	const assignmentsByRentalRecordId =
		groupAssignmentsByRentalRecordId(allAssignments);
	const assignmentsByTrailerRecordId =
		groupAssignmentsByTrailerRecordId(allAssignments);

	const rentalsDetailed = rentals.map((rental) => {
		const rentalAssignments =
			assignmentsByRentalRecordId.get(rental.recordId) ?? [];
		const assignmentTrailerRecordIds = rentalAssignments.flatMap(
			(assignment) => assignment.trailerRecordIds
		);
		const mergedTrailerRecordIds = Array.from(
			new Set([...rental.trailerRecordIds, ...assignmentTrailerRecordIds])
		);

		const trailersDetailed = mergedTrailerRecordIds
			.map((recordId) => trailersByRecordId.get(recordId))
			.filter(Boolean)
			.map(mapAdminTrailerOption);

		return {
			rentalId: rental.id,
			recordId: rental.recordId,
			status: rental.status,
			billingFrequency: rental.billingFrequency,
			rate: rental.rate,
			depositAmount: rental.depositAmount,
			contractStartDate: rental.contractStartDate,
			operationalStartDate: rental.operationalStartDate,
			endDate: rental.endDate,
			currentPeriodEnd: rental.currentPeriodEnd,
			billingStatus: rental.billingStatus,
			trailers: trailersDetailed,
			assignments: rentalAssignments.map((assignment) =>
				mapAdminAssignment(assignment, trailersByRecordId)
			),
			documents: documentsByRentalRecordId.get(rental.recordId) ?? [],
		};
	});

	const conflicts = rentalsDetailed.flatMap((rental) =>
		rental.trailers.flatMap((trailer) => {
			const trailerAssignments =
				assignmentsByTrailerRecordId.get(trailer.recordId) ?? [];
			const blockingAssignments = trailerAssignments.filter(
				(assignment) =>
					assignment.status === "Active" &&
					!assignment.rentalRecordIds.includes(rental.recordId)
			);

			if (!blockingAssignments.length) return [];

			return [
				{
					rentalRecordId: rental.recordId,
					trailerRecordId: trailer.recordId,
					trailerId: trailer.trailerId,
					message: `Trailer ${trailer.trailerId || trailer.recordId} is actively assigned to another rental.`,
					assignments: blockingAssignments.map((assignment) =>
						mapAdminAssignment(assignment, trailersByRecordId)
					),
				},
			];
		})
	);

	return {
		customer: {
			customerId: customer.id,
			recordId: customer.recordId,
			companyName: customer.companyName,
			primaryEmail: customer.primaryEmail,
			status: customer.status,
			submittedAt: customer.submittedAt,
			reviewedAt: customer.reviewedAt,
			applicationIntakeSummary: customer.applicationIntakeSummary,
			reviewNotes: customer.reviewNotes,
			decisionBy: customer.decisionBy,
		},
		rentals: rentalsDetailed,
		documents: allDocuments.map(publicDocumentView),
		availableTrailers: availableTrailers.map(mapAdminTrailerOption),
		conflicts,
	};
}

export async function applyAdminApplicationDecision(customerId, decisionInput = {}) {
	const action =
		typeof decisionInput.action === "string"
			? decisionInput.action.trim().toLowerCase()
			: "";

	const actionOutcome = APPLICATION_DECISION_OUTCOME[action];
	if (!actionOutcome) {
		throw new ApplicationDecisionError(
			"VALIDATION",
			"Decision action must be one of: approve, deny, request_info."
		);
	}

	const customer = await getCustomerByCustomerId(customerId);
	if (!customer) {
		throw new ApplicationDecisionError("NOT_FOUND", "Application customer not found.");
	}

	if (!APPLICATION_REVIEW_CUSTOMER_STATUSES.has(customer.status)) {
		throw new ApplicationDecisionError(
			"CONFLICT",
			`Customer status ${customer.status || "Unknown"} is not reviewable.`
		);
	}

	const rentals = await getRentalsByCustomer(customer.recordId);
	if (!rentals.length) {
		throw new ApplicationDecisionError(
			"CONFLICT",
			"No rental record is linked to this application."
		);
	}

	const reviewedAt = new Date().toISOString();
	const reviewNotes =
		typeof decisionInput.reviewNotes === "string"
			? decisionInput.reviewNotes.trim()
			: "";
	const decisionBy =
		typeof decisionInput.decisionBy === "string"
			? decisionInput.decisionBy.trim()
			: "";

	const customerUpdateFields = sanitizeFieldsForUpdate({
		[AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.STATUS]: actionOutcome.customerStatus,
		[AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.REVIEWED_AT]: reviewedAt,
		[AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.DECISION_BY]: decisionBy || undefined,
		[AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.REVIEW_NOTES]:
			reviewNotes || customer.reviewNotes || null,
	});

	if (action === APPLICATION_DECISION_ACTIONS.APPROVE) {
		const trailerRecordIds = normalizeRecordIdList(
			decisionInput.trailerRecordIds ?? decisionInput.trailerRecordId
		);
		const rate = normalizeCurrencyValue(decisionInput.rate);
		const depositAmount = normalizeCurrencyValue(decisionInput.depositAmount);
		const billingFrequency = normalizeBillingFrequencyValue(
			decisionInput.billingFrequency
		);
		const contractStartDate = normalizeDateOnlyValue(
			decisionInput.contractStartDate
		);
		const operationalStartDateInput = decisionInput.operationalStartDate;
		const operationalStartDate = normalizeDateOnlyValue(
			operationalStartDateInput
		);
		const endDateInput = decisionInput.endDate;
		const endDate = normalizeDateOnlyValue(endDateInput);

		if (!trailerRecordIds.length) {
			throw new ApplicationDecisionError(
				"VALIDATION",
				"Approval requires at least one selected trailer."
			);
		}

		if (rate === null || rate < 0) {
			throw new ApplicationDecisionError(
				"VALIDATION",
				"Approval requires a valid non-negative rate."
			);
		}

		if (depositAmount === null || depositAmount < 0) {
			throw new ApplicationDecisionError(
				"VALIDATION",
				"Approval requires a valid non-negative deposit amount."
			);
		}

		if (!contractStartDate) {
			throw new ApplicationDecisionError(
				"VALIDATION",
				"Approval requires a valid contract start date."
			);
		}

		if (operationalStartDateInput && !operationalStartDate) {
			throw new ApplicationDecisionError(
				"VALIDATION",
				"Operational start date must be a valid YYYY-MM-DD value."
			);
		}

		if (endDateInput && !endDate) {
			throw new ApplicationDecisionError(
				"VALIDATION",
				"End date must be a valid YYYY-MM-DD value."
			);
		}

		if (decisionInput.billingFrequency && !billingFrequency) {
			throw new ApplicationDecisionError(
				"VALIDATION",
				"Billing frequency must be Weekly, Monthly, or Yearly."
			);
		}

		const targetRental = selectDecisionTargetRental(rentals);
		if (!targetRental) {
			throw new ApplicationDecisionError(
				"CONFLICT",
				"No rental record is linked to this application."
			);
		}

		if (!APPLICATION_REVIEW_RENTAL_STATUSES.has(targetRental.status)) {
			throw new ApplicationDecisionError(
				"CONFLICT",
				`Rental status ${targetRental.status || "Unknown"} cannot be approved.`
			);
		}

		const selectedEndDate = endDate || targetRental.endDate || null;
		const selectedBillingFrequency =
			billingFrequency || targetRental.billingFrequency || "Monthly";
		const trailers = await getTrailersByIds(trailerRecordIds);
		if (trailers.length !== trailerRecordIds.length) {
			throw new ApplicationDecisionError(
				"VALIDATION",
				"One or more selected trailers were not found."
			);
		}

		const activeAssignmentsForRental = (
			await getAssignmentsByRentalIds([targetRental.recordId])
		).filter((assignment) => assignment.status === "Active");
		const existingAssignmentsByTrailerRecordId = new Map(
			activeAssignmentsForRental.flatMap((assignment) =>
				assignment.trailerRecordIds.map((recordId) => [recordId, assignment])
			)
		);
		const activeAssignmentsForSelectedTrailers = await getAssignmentsByTrailerIds(
			trailerRecordIds
		);

		for (const trailer of trailers) {
			const trailerAssignments = activeAssignmentsForSelectedTrailers.filter(
				(assignment) => assignment.trailerRecordIds.includes(trailer.recordId)
			);
			const conflictingAssignments = findTrailerAssignmentConflicts(
				trailerAssignments,
				trailer.recordId,
				targetRental.recordId,
				contractStartDate,
				selectedEndDate
			);
			const alreadyAssignedToTargetRental = trailerAssignments.some((assignment) =>
				assignment.rentalRecordIds.includes(targetRental.recordId)
			);

			if (
				conflictingAssignments.length ||
				(trailer.status !== "Available" && !alreadyAssignedToTargetRental)
			) {
				const conflictReason = conflictingAssignments.length
					? "it is already assigned to another active rental"
					: `it is currently ${trailer.status || "unavailable"}`;
				throw new ApplicationDecisionError(
					"CONFLICT",
					`Trailer ${trailer.id || trailer.recordId} cannot be assigned because ${conflictReason}.`
				);
			}
		}

		const previouslyAssignedTrailerRecordIds = Array.from(
			new Set(
				activeAssignmentsForRental.flatMap((assignment) => assignment.trailerRecordIds)
			)
		);
		// TEMPORARY: Stripe provisioning is disabled until a valid STRIPE_SECRET_KEY
		// is available. Re-enable the commented block below when Stripe testing resumes.
		const stripeProvisioning = {};
		/*
		let stripeProvisioning;
		try {
			stripeProvisioning = await ensureStripeBillingRecords({
				customer,
				rental: targetRental,
				rate,
				billingFrequency: selectedBillingFrequency,
				contractStartDate,
			});
		} catch (error) {
			throw new ApplicationDecisionError(
				"STRIPE",
				error instanceof Error
					? error.message
					: "Failed to provision Stripe billing records."
			);
		}
		*/
		const billingStatus =
			normalizeBillingStatusValue(stripeProvisioning?.subscription?.status) ||
			(actionOutcome.rentalStatus === "Awaiting First Payment"
				? "Awaiting First Payment"
				: targetRental.billingStatus || "Draft");

		const rentalUpdateFields = sanitizeFieldsForUpdate({
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.STATUS]: actionOutcome.rentalStatus,
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.TRAILER]: trailerRecordIds,
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.RATE]: rate,
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.DEPOSIT_AMOUNT]: depositAmount,
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.CONTRACT_START_DATE]: contractStartDate,
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.OPERATIONAL_START_DATE]:
				operationalStartDate || contractStartDate,
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.END_DATE]: selectedEndDate || null,
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.BILLING_FREQUENCY]:
				selectedBillingFrequency,
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.STRIPE_PRODUCT_ID]:
				stripeProvisioning.productId,
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.STRIPE_PRICE_ID]:
				stripeProvisioning.priceId,
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.STRIPE_SUBSCRIPTION_ID]:
				stripeProvisioning.subscriptionId,
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.CURRENT_PERIOD_END]:
				stripeProvisioning.subscription?.current_period_end
					? new Date(
							stripeProvisioning.subscription.current_period_end * 1000
					  )
							.toISOString()
							.slice(0, 10)
					: undefined,
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.LAST_INVOICE_ID]:
				stripeProvisioning.subscription?.latest_invoice || undefined,
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.BILLING_STATUS]: billingStatus,
		});
		if (stripeProvisioning.stripeCustomerId) {
			customerUpdateFields[AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.STRIPE_CUSTOMER_ID] =
				stripeProvisioning.stripeCustomerId;
		}

		await updateRecordById(
			AIRTABLE_SCHEMA.TABLES.RENTALS,
			targetRental.recordId,
			rentalUpdateFields
		);
		await updateRecordById(
			AIRTABLE_SCHEMA.TABLES.CUSTOMERS,
			customer.recordId,
			customerUpdateFields
		);
		for (const trailerRecordId of trailerRecordIds) {
			await updateRecordById(
				AIRTABLE_SCHEMA.TABLES.TRAILERS,
				trailerRecordId,
				{
					[AIRTABLE_SCHEMA.FIELDS.TRAILERS.STATUS]: "Reserved",
				}
			);
		}

		const assignmentRecordIds = [];
		for (const trailerRecordId of trailerRecordIds) {
			const existingAssignment =
				existingAssignmentsByTrailerRecordId.get(trailerRecordId) ?? null;

			if (existingAssignment) {
				await updateRecordById(
					AIRTABLE_SCHEMA.TABLES.ASSINGMENTS,
					existingAssignment.recordId,
					{
						[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.RENTAL]: [targetRental.recordId],
						[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.TRAILER]: [trailerRecordId],
						[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.START_DATE]: contractStartDate,
						[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.END_DATE]:
							selectedEndDate || null,
						[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.STATUS]: "Active",
						[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.NOTES]: reviewNotes || undefined,
					}
				);
				assignmentRecordIds.push(existingAssignment.id);
				continue;
			}

			const createdAssignment = await createRecord(
				AIRTABLE_SCHEMA.TABLES.ASSINGMENTS,
				{
					[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.RENTAL]: [targetRental.recordId],
					[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.TRAILER]: [trailerRecordId],
					[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.START_DATE]: contractStartDate,
					[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.END_DATE]:
						selectedEndDate || null,
					[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.STATUS]: "Active",
					[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.NOTES]: reviewNotes || undefined,
				}
			);
			assignmentRecordIds.push(createdAssignment.id);
		}

		const assignmentsToExpire = activeAssignmentsForRental.filter(
			(assignment) =>
				assignment.trailerRecordIds.some(
					(recordId) => !trailerRecordIds.includes(recordId)
				)
		);
		for (const assignment of assignmentsToExpire) {
			await updateRecordById(
				AIRTABLE_SCHEMA.TABLES.ASSINGMENTS,
				assignment.recordId,
				{
					[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.STATUS]: "Expired",
					[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.END_DATE]:
						selectedEndDate || contractStartDate,
					[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.NOTES]: reviewNotes || assignment.notes || undefined,
				}
			);
		}

		const releasedTrailerRecordIds = previouslyAssignedTrailerRecordIds.filter(
			(recordId) => recordId && !trailerRecordIds.includes(recordId)
		);
		for (const releasedTrailerRecordId of releasedTrailerRecordIds) {
			await syncTrailerStatusForAvailability(releasedTrailerRecordId);
		}

		return {
			customerId: customer.id,
			action,
			customerStatus: actionOutcome.customerStatus,
			rentalStatus: actionOutcome.rentalStatus,
			rentalId: targetRental.id,
			trailerIds: trailers.map((trailer) => trailer.id),
			stripeCustomerId: stripeProvisioning.stripeCustomerId,
			stripeProductId: stripeProvisioning.productId,
			stripePriceId: stripeProvisioning.priceId,
			stripeSubscriptionId: stripeProvisioning.subscriptionId,
			assignmentRecordIds,
			reviewedAt,
		};
	}

	const rentalsToUpdate = rentals.filter((rental) =>
		APPLICATION_REVIEW_RENTAL_STATUSES.has(rental.status)
	);
	const targetRentals = rentalsToUpdate.length ? rentalsToUpdate : rentals;
	const targetRentalRecordIds = targetRentals.map((rental) => rental.recordId);
	const activeAssignmentsForRentals = (
		await getAssignmentsByRentalIds(targetRentalRecordIds)
	).filter((assignment) => assignment.status === "Active");
	const reservedTrailerRecordIds = Array.from(
		new Set(activeAssignmentsForRentals.flatMap((assignment) => assignment.trailerRecordIds))
	);

	await Promise.all([
		...targetRentals.map((rental) =>
			updateRecordById(AIRTABLE_SCHEMA.TABLES.RENTALS, rental.recordId, {
				[AIRTABLE_SCHEMA.FIELDS.RENTALS.STATUS]: actionOutcome.rentalStatus,
				[AIRTABLE_SCHEMA.FIELDS.RENTALS.TRAILER]: [],
			})
		),
		...activeAssignmentsForRentals.map((assignment) =>
			updateRecordById(AIRTABLE_SCHEMA.TABLES.ASSINGMENTS, assignment.recordId, {
				[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.STATUS]: "Expired",
				[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.NOTES]:
					reviewNotes || assignment.notes || undefined,
			})
		),
		updateRecordById(
			AIRTABLE_SCHEMA.TABLES.CUSTOMERS,
			customer.recordId,
			customerUpdateFields
		),
	]);

	for (const trailerRecordId of reservedTrailerRecordIds) {
		await syncTrailerStatusForAvailability(trailerRecordId);
	}

	return {
		customerId: customer.id,
		action,
		customerStatus: actionOutcome.customerStatus,
		rentalStatus: actionOutcome.rentalStatus,
		updatedRentals: targetRentals.length,
		reviewedAt,
	};
}

export async function getAdminRentalsData(
	statuses = ADMIN_ACTIVE_RENTAL_STATUSES
) {
	const rentals = await getRentalsByStatuses(statuses);
	const rentalRecordIds = rentals.map((rental) => rental.recordId);

	const customerRecordIds = Array.from(
		new Set(rentals.flatMap((rental) => rental.customerRecordIds))
	);
	const assignments = await getAssignmentsByRentalIds(rentalRecordIds);
	const trailerRecordIds = Array.from(
		new Set([
			...rentals.flatMap((rental) => rental.trailerRecordIds),
			...assignments.flatMap((assignment) => assignment.trailerRecordIds),
		])
	);

	const [customers, trailers] = await Promise.all([
		getCustomersByIds(customerRecordIds),
		getTrailersByIds(trailerRecordIds),
	]);

	return enrichRentalsForAdmin(rentals, customers, trailers, assignments);
}

export async function getAdminWatchlistData() {
	const [customers, rentals] = await Promise.all([
		getCustomersByStatuses(ADMIN_WATCHLIST_CUSTOMER_STATUSES),
		getAdminRentalsData(ADMIN_WATCHLIST_RENTAL_STATUSES),
	]);

	return {
		customers: customers.map((customer) => ({
			customerId: customer.id,
			recordId: customer.recordId,
			companyName: customer.companyName,
			primaryEmail: customer.primaryEmail,
			status: customer.status,
			reviewedAt: customer.reviewedAt,
		})),
		rentals,
	};
}

export async function getAdminInventoryData() {
	const [trailers, activeAssignments] = await Promise.all([
		getTrailersByStatuses(ADMIN_INVENTORY_TRAILER_STATUSES),
		getAssignmentsByStatuses(ACTIVE_ASSIGNMENT_STATUSES),
	]);

	const activeRentalRecordIds = Array.from(
		new Set(activeAssignments.flatMap((assignment) => assignment.rentalRecordIds))
	);
	const assignmentBackedRentals = await getRentalsByIds(activeRentalRecordIds);
	const fallbackRentals = await getRentalsByStatuses(ADMIN_ACTIVE_RENTAL_STATUSES);
	const activeRentals = dedupeByRecordId([
		...assignmentBackedRentals,
		...fallbackRentals,
	]);
	const rentalsByRecordId = new Map(
		activeRentals.map((rental) => [rental.recordId, rental])
	);
	const rentalsByTrailerRecordId = new Map();
	for (const rental of activeRentals) {
		for (const trailerRecordId of rental.trailerRecordIds) {
			const current = rentalsByTrailerRecordId.get(trailerRecordId) ?? [];
			current.push(rental);
			rentalsByTrailerRecordId.set(trailerRecordId, current);
		}
	}

	const activeAssignmentsByTrailerRecordId = new Map();
	for (const assignment of activeAssignments) {
		for (const trailerRecordId of assignment.trailerRecordIds) {
			const current = activeAssignmentsByTrailerRecordId.get(trailerRecordId) ?? [];
			current.push(assignment);
			activeAssignmentsByTrailerRecordId.set(trailerRecordId, current);
		}
	}

	return trailers.map((trailer) => {
		const assignmentCoverage =
			activeAssignmentsByTrailerRecordId.get(trailer.recordId) ?? [];
		const linkedRentals =
			rentalsByTrailerRecordId.get(trailer.recordId) ?? [];

		return {
		trailerId: trailer.id,
		recordId: trailer.recordId,
		trailerType: trailer.trailerType,
		plateNumber: trailer.plateNumber,
		vin: trailer.vin,
		status: trailer.status,
		activeAssignmentCount: assignmentCoverage.length,
		assignments: assignmentCoverage.map(
			(assignment) => ({
				assignmentId: assignment.id,
				startDate: assignment.startDate,
				endDate: assignment.endDate,
				status: assignment.status,
				rentalIds: assignment.rentalRecordIds
					.map((recordId) => rentalsByRecordId.get(recordId)?.id)
					.filter(Boolean),
			})
		),
		linkedRentals: linkedRentals.map((rental) => ({
			rentalId: rental.id,
			recordId: rental.recordId,
			status: rental.status,
			contractStartDate: rental.contractStartDate,
			endDate: rental.endDate,
		})),
		};
	});
}

export async function getAdminSummaryData() {
	const [applications, rentals, watchlist, inventory] = await Promise.all([
		getAdminApplicationsData(),
		getAdminRentalsData(),
		getAdminWatchlistData(),
		getAdminInventoryData(),
	]);

	return {
		applicationsPending: applications.length,
		awaitingPayment: applications.filter(
			(application) => application.status === "Awaiting Payment"
		).length,
		activeRentals: rentals.filter((rental) => rental.status === "Active").length,
		overdueRentals: rentals.filter((rental) => rental.status === "Overdue").length,
		pastDueCustomers: watchlist.customers.filter(
			(customer) => customer.status === "Past Due"
		).length,
		suspendedCustomers: watchlist.customers.filter(
			(customer) => customer.status === "Suspended"
		).length,
		trailersByStatus: summarizeTrailersByStatus(
			inventory.map((trailer) => ({ status: trailer.status }))
		),
	};
}

async function expireAssignmentsByRentalRecordId(rentalRecordId, notes) {
	const activeAssignments = (
		await getAssignmentsByRentalIds([rentalRecordId])
	).filter((assignment) => assignment.status === "Active");

	for (const assignment of activeAssignments) {
		await updateRecordById(
			AIRTABLE_SCHEMA.TABLES.ASSINGMENTS,
			assignment.recordId,
			{
				[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.STATUS]: "Expired",
				[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.END_DATE]:
					assignment.endDate || new Date().toISOString().slice(0, 10),
				[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.NOTES]: notes || assignment.notes || undefined,
			}
		);
	}

	for (const trailerRecordId of Array.from(
		new Set(activeAssignments.flatMap((assignment) => assignment.trailerRecordIds))
	)) {
		await syncTrailerStatusForAvailability(trailerRecordId);
	}

	return activeAssignments.length;
}

async function expireAssignmentsByTrailerRecordId(trailerRecordId, notes) {
	const activeAssignments = await getAssignmentsByTrailerIds(
		[trailerRecordId],
		ACTIVE_ASSIGNMENT_STATUSES
	);

	for (const assignment of activeAssignments) {
		await updateRecordById(
			AIRTABLE_SCHEMA.TABLES.ASSINGMENTS,
			assignment.recordId,
			{
				[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.STATUS]: "Expired",
				[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.END_DATE]:
					assignment.endDate || new Date().toISOString().slice(0, 10),
				[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.NOTES]: notes || assignment.notes || undefined,
			}
		);
	}

	await syncTrailerStatusForAvailability(trailerRecordId);
	return activeAssignments.length;
}

export async function updateAdminEntityStatus({
	entityType,
	recordId,
	nextStatus,
	reason,
	decisionBy,
}) {
	const normalizedEntityType =
		typeof entityType === "string" ? entityType.trim().toLowerCase() : "";
	const normalizedRecordId =
		typeof recordId === "string" ? recordId.trim() : "";
	const normalizedNextStatus =
		typeof nextStatus === "string" ? nextStatus : "";
	const normalizedReason =
		typeof reason === "string" ? reason.trim() : "";
	const normalizedDecisionBy =
		typeof decisionBy === "string" ? decisionBy.trim() : "";

	if (!normalizedEntityType || !normalizedRecordId || !normalizedNextStatus) {
		throw new ApplicationDecisionError(
			"VALIDATION",
			"Entity type, record ID, and next status are required."
		);
	}

	if (normalizedEntityType === "customer") {
		if (!ADMIN_CUSTOMER_STATUS_OPTIONS.includes(normalizedNextStatus)) {
			throw new ApplicationDecisionError(
				"VALIDATION",
				"Selected customer status is not supported."
			);
		}

		const [customer] = await getCustomersByIds([normalizedRecordId]);
		if (!customer) {
			throw new ApplicationDecisionError("NOT_FOUND", "Customer record not found.");
		}

		await updateRecordById(
			AIRTABLE_SCHEMA.TABLES.CUSTOMERS,
			normalizedRecordId,
			{
				[AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.STATUS]: normalizedNextStatus,
				[AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.REVIEWED_AT]: new Date().toISOString(),
				[AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.DECISION_BY]:
					normalizedDecisionBy || undefined,
				[AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.REVIEW_NOTES]:
					normalizedReason || customer.reviewNotes || null,
			}
		);

		return {
			entityType: normalizedEntityType,
			recordId: normalizedRecordId,
			nextStatus: normalizedNextStatus,
			sideEffects: [],
			confirmation: getStatusTransitionSummary(
				normalizedEntityType,
				normalizedNextStatus
			),
		};
	}

	if (normalizedEntityType === "rental") {
		if (!ADMIN_RENTAL_STATUS_OPTIONS.includes(normalizedNextStatus)) {
			throw new ApplicationDecisionError(
				"VALIDATION",
				"Selected rental status is not supported."
			);
		}

		const [rental] = await getRentalsByIds([normalizedRecordId]);
		if (!rental) {
			throw new ApplicationDecisionError("NOT_FOUND", "Rental record not found.");
		}

		const sideEffects = [];
		await updateRecordById(
			AIRTABLE_SCHEMA.TABLES.RENTALS,
			normalizedRecordId,
			{
				[AIRTABLE_SCHEMA.FIELDS.RENTALS.STATUS]: normalizedNextStatus,
			}
		);

		if (
			normalizedNextStatus === "Returned" ||
			normalizedNextStatus === RENTAL_STATUS_CANCELLED
		) {
			await updateRecordById(
				AIRTABLE_SCHEMA.TABLES.RENTALS,
				normalizedRecordId,
				{
					[AIRTABLE_SCHEMA.FIELDS.RENTALS.TRAILER]: [],
				}
			);
			const expiredCount = await expireAssignmentsByRentalRecordId(
				normalizedRecordId,
				normalizedReason
			);
			sideEffects.push(
				`Expired ${expiredCount} active assignment${expiredCount === 1 ? "" : "s"} for this rental.`
			);
		}

		return {
			entityType: normalizedEntityType,
			recordId: normalizedRecordId,
			nextStatus: normalizedNextStatus,
			sideEffects,
			confirmation: getStatusTransitionSummary(
				normalizedEntityType,
				normalizedNextStatus
			),
			rentalId: rental.id,
		};
	}

	if (normalizedEntityType === "trailer") {
		if (!ADMIN_TRAILER_STATUS_OPTIONS.includes(normalizedNextStatus)) {
			throw new ApplicationDecisionError(
				"VALIDATION",
				"Selected trailer status is not supported."
			);
		}

		const [trailer] = await getTrailersByIds([normalizedRecordId]);
		if (!trailer) {
			throw new ApplicationDecisionError("NOT_FOUND", "Trailer record not found.");
		}

		const sideEffects = [];
		if (normalizedNextStatus === "Available" || normalizedNextStatus === "Maintenance") {
			const affectedAssignments = await getAssignmentsByTrailerIds(
				[normalizedRecordId],
				ACTIVE_ASSIGNMENT_STATUSES
			);
			if (affectedAssignments.length) {
				const expiredCount = await expireAssignmentsByTrailerRecordId(
					normalizedRecordId,
					normalizedReason
				);
				sideEffects.push(
					`Expired ${expiredCount} active assignment${expiredCount === 1 ? "" : "s"} tied to this trailer.`
				);
			}
		}

		await updateRecordById(
			AIRTABLE_SCHEMA.TABLES.TRAILERS,
			normalizedRecordId,
			{
				[AIRTABLE_SCHEMA.FIELDS.TRAILERS.STATUS]: normalizedNextStatus,
			}
		);

		return {
			entityType: normalizedEntityType,
			recordId: normalizedRecordId,
			nextStatus: normalizedNextStatus,
			sideEffects,
			confirmation: getStatusTransitionSummary(
				normalizedEntityType,
				normalizedNextStatus
			),
			trailerId: trailer.id,
		};
	}

	throw new ApplicationDecisionError(
		"VALIDATION",
		"Entity type must be customer, rental, or trailer."
	);
}

function mapCustomerStatusFromBillingStatus(billingStatus, fallbackStatus) {
	switch (billingStatus) {
		case "Active":
			return "Active";
		case "Past Due":
			return "Past Due";
		case "Suspended":
		case "Unpaid":
		case "Cancelled":
			return "Suspended";
		case "Awaiting First Payment":
		case "Draft":
			return "Awaiting Payment";
		default:
			return fallbackStatus || null;
	}
}

function mapRentalStatusFromBillingStatus(billingStatus, currentRentalStatus) {
	switch (billingStatus) {
		case "Active":
			return "Active";
		case "Past Due":
		case "Unpaid":
			return "Overdue";
		case "Suspended":
			return currentRentalStatus === "Awaiting First Payment"
				? "Awaiting First Payment"
				: "Overdue";
		case "Awaiting First Payment":
		case "Draft":
			return "Awaiting First Payment";
		case "Cancelled":
			return "Cancelled";
		default:
			return currentRentalStatus || null;
	}
}

async function resolveStripeWebhookTargets(stripeObject) {
	const subscriptionId = extractStripeSubscriptionId(stripeObject);
	const invoiceId = extractStripeInvoiceId(stripeObject);
	const stripeCustomerId = extractStripeCustomerId(stripeObject);

	let rental = null;
	if (subscriptionId) {
		rental = await getRentalByStripeSubscriptionId(subscriptionId);
	}
	if (!rental && invoiceId) {
		rental = await getRentalByLastInvoiceId(invoiceId);
	}

	let customer = null;
	if (rental?.customerRecordIds?.length) {
		[customer] = await getCustomersByIds(rental.customerRecordIds);
	}
	if (!customer && stripeCustomerId) {
		customer = await getCustomerByStripeCustomerId(stripeCustomerId);
	}

	return {
		rental,
		customer,
		subscriptionId,
		invoiceId,
		stripeCustomerId,
	};
}

export async function applyStripeWebhookEvent(eventPayload = {}) {
	const eventType =
		typeof eventPayload?.type === "string" ? eventPayload.type.trim() : "";
	const stripeObject = extractStripeObject(eventPayload);

	if (!eventType) {
		throw new Error("Stripe webhook event type is required.");
	}

	if (!stripeObject) {
		throw new Error("Stripe webhook payload must include data.object.");
	}

	const { rental, customer, subscriptionId, invoiceId, stripeCustomerId } =
		await resolveStripeWebhookTargets(stripeObject);

	if (!rental) {
		return {
			handled: false,
			eventType,
			reason: "No matching rental record was found for the Stripe event.",
			subscriptionId,
			invoiceId,
			stripeCustomerId,
		};
	}

	const currentPeriodEnd =
		extractStripeCurrentPeriodEnd(stripeObject) || rental.currentPeriodEnd || null;
	const resolvedInvoiceId = invoiceId || rental.stripe?.lastInvoiceId || null;

	if (eventType === "invoice.paid" || eventType === "checkout.session.completed") {
		await applyBillingUpdateToRental({
			rental,
			customer,
			billingStatus: "Active",
			rentalStatus: "Active",
			customerStatus: "Active",
			currentPeriodEnd,
			lastInvoiceId: resolvedInvoiceId,
			setTrailersToRented: true,
		});

		return {
			handled: true,
			eventType,
			rentalId: rental.id,
			customerId: customer?.id || null,
			billingStatus: "Active",
		};
	}

	if (eventType === "invoice.payment_failed") {
		const billingStatus = "Past Due";
		await applyBillingUpdateToRental({
			rental,
			customer,
			billingStatus,
			rentalStatus: "Overdue",
			customerStatus: "Past Due",
			currentPeriodEnd,
			lastInvoiceId: resolvedInvoiceId,
		});

		return {
			handled: true,
			eventType,
			rentalId: rental.id,
			customerId: customer?.id || null,
			billingStatus,
		};
	}

	if (eventType === "customer.subscription.updated") {
		const billingStatus =
			normalizeBillingStatusValue(stripeObject.status) ||
			rental.billingStatus ||
			"Draft";
		const nextRentalStatus = mapRentalStatusFromBillingStatus(
			billingStatus,
			rental.status
		);
		const nextCustomerStatus = mapCustomerStatusFromBillingStatus(
			billingStatus,
			customer?.status
		);

		await applyBillingUpdateToRental({
			rental,
			customer,
			billingStatus,
			rentalStatus: nextRentalStatus,
			customerStatus: nextCustomerStatus,
			currentPeriodEnd,
			lastInvoiceId: resolvedInvoiceId,
			releaseTrailers: billingStatus === "Cancelled",
			setTrailersToRented: billingStatus === "Active",
		});

		return {
			handled: true,
			eventType,
			rentalId: rental.id,
			customerId: customer?.id || null,
			billingStatus,
		};
	}

	if (eventType === "customer.subscription.deleted") {
		await applyBillingUpdateToRental({
			rental,
			customer,
			billingStatus: "Cancelled",
			rentalStatus: "Cancelled",
			customerStatus: "Suspended",
			currentPeriodEnd,
			lastInvoiceId: resolvedInvoiceId,
			releaseTrailers: true,
		});

		return {
			handled: true,
			eventType,
			rentalId: rental.id,
			customerId: customer?.id || null,
			billingStatus: "Cancelled",
		};
	}

	return {
		handled: false,
		eventType,
		reason: "Stripe event type is not yet mapped to an Airtable sync action.",
		rentalId: rental.id,
		customerId: customer?.id || null,
	};
}

export async function getPortalDataByEmail(email) {
	const customer = await getCustomerByPrimaryEmail(email);
	if (!customer) return null;

	const rentals = await getRentalsByCustomer(customer.recordId);
	const rentalRecordIds = rentals.map((rental) => rental.recordId);

	const [assignments, customerDocuments, rentalDocuments] = await Promise.all([
		getAssignmentsByRentalIds(rentalRecordIds),
		getCustomerDocuments(customer.recordId),
		getRentalDocuments(rentalRecordIds),
	]);

	const trailerRecordIds = Array.from(
		new Set([
			...rentals.flatMap((rental) => rental.trailerRecordIds),
			...assignments.flatMap((assignment) => assignment.trailerRecordIds),
		])
	);
	const trailers = await getTrailersByIds(trailerRecordIds);

	return buildPortalContract(
		customer,
		rentals,
		assignments,
		trailers,
		[...customerDocuments, ...rentalDocuments]
	);
}

export { AIRTABLE_SCHEMA };
