import Airtable from "airtable";

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
const APPLICATION_REVIEW_CUSTOMER_STATUSES = new Set([
	"Submitted",
	"Review",
	"Needs Info",
	"Awaiting Payment",
]);
const APPLICATION_REVIEW_RENTAL_STATUSES = new Set([
	"Submitted",
	"Awaiting First Payment",
]);
const ACTIVE_ASSIGNMENT_STATUSES = ["Active"];
const RENTAL_STATUS_CANCELLED = "Cancelled ";

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
		rentalStatus: "Submitted",
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
			reviewNotes: customer.reviewNotes,
			decisionBy: customer.decisionBy,
		},
		rentals: rentalsDetailed,
		documents: allDocuments
			.filter((document) => document.rentalRecordIds.length === 0)
			.map(publicDocumentView),
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

	const customerUpdateFields = sanitizeFieldsForUpdate({
		[AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.STATUS]: actionOutcome.customerStatus,
		[AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.REVIEWED_AT]: reviewedAt,
		[AIRTABLE_SCHEMA.FIELDS.CUSTOMERS.REVIEW_NOTES]: reviewNotes || null,
	});

	if (action === APPLICATION_DECISION_ACTIONS.APPROVE) {
		const trailerRecordId =
			typeof decisionInput.trailerRecordId === "string"
				? decisionInput.trailerRecordId.trim()
				: "";
		const rate = normalizeCurrencyValue(decisionInput.rate);
		const depositAmount = normalizeCurrencyValue(decisionInput.depositAmount);
		const contractStartDate = normalizeDateOnlyValue(
			decisionInput.contractStartDate
		);
		const operationalStartDateInput = decisionInput.operationalStartDate;
		const operationalStartDate = normalizeDateOnlyValue(
			operationalStartDateInput
		);

		if (!trailerRecordId) {
			throw new ApplicationDecisionError(
				"VALIDATION",
				"Approval requires a selected trailer."
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

		const [trailer] = await getTrailersByIds([trailerRecordId]);
		if (!trailer) {
			throw new ApplicationDecisionError(
				"VALIDATION",
				"Selected trailer was not found."
			);
		}

		const activeAssignmentsForTrailer = await getAssignmentsByTrailerIds([
			trailerRecordId,
		]);
		const conflictingAssignments = findTrailerAssignmentConflicts(
			activeAssignmentsForTrailer,
			trailerRecordId,
			targetRental.recordId,
			contractStartDate,
			targetRental.endDate
		);

		if (trailer.status !== "Available" || conflictingAssignments.length) {
			const conflictReason = conflictingAssignments.length
				? "it is already assigned to another active rental"
				: `it is currently ${trailer.status || "unavailable"}`;
			throw new ApplicationDecisionError(
				"CONFLICT",
				`Trailer ${trailer.id || trailer.recordId} cannot be assigned because ${conflictReason}.`
			);
		}

		const activeAssignmentsForRental = (
			await getAssignmentsByRentalIds([targetRental.recordId])
		).filter((assignment) => assignment.status === "Active");
		const existingActiveAssignment = activeAssignmentsForRental[0] ?? null;
		const previousTrailerRecordIds = existingActiveAssignment?.trailerRecordIds ?? [];

		const rentalUpdateFields = sanitizeFieldsForUpdate({
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.STATUS]: actionOutcome.rentalStatus,
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.TRAILER]: [trailerRecordId],
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.RATE]: rate,
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.DEPOSIT_AMOUNT]: depositAmount,
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.CONTRACT_START_DATE]: contractStartDate,
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.OPERATIONAL_START_DATE]:
				operationalStartDate || contractStartDate,
			[AIRTABLE_SCHEMA.FIELDS.RENTALS.BILLING_FREQUENCY]:
				targetRental.billingFrequency || "Monthly",
		});

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
		await updateRecordById(AIRTABLE_SCHEMA.TABLES.TRAILERS, trailerRecordId, {
			[AIRTABLE_SCHEMA.FIELDS.TRAILERS.STATUS]: "Reserved",
		});

		let assignmentRecordId = existingActiveAssignment?.recordId ?? null;
		if (existingActiveAssignment) {
			await updateRecordById(
				AIRTABLE_SCHEMA.TABLES.ASSINGMENTS,
				existingActiveAssignment.recordId,
				{
					[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.RENTAL]: [targetRental.recordId],
					[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.TRAILER]: [trailerRecordId],
					[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.START_DATE]: contractStartDate,
					[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.END_DATE]:
						targetRental.endDate || undefined,
					[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.STATUS]: "Active",
					[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.NOTES]: reviewNotes || undefined,
				}
			);
		} else {
			const createdAssignment = await createRecord(
				AIRTABLE_SCHEMA.TABLES.ASSINGMENTS,
				{
					[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.RENTAL]: [targetRental.recordId],
					[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.TRAILER]: [trailerRecordId],
					[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.START_DATE]: contractStartDate,
					[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.END_DATE]:
						targetRental.endDate || undefined,
					[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.STATUS]: "Active",
					[AIRTABLE_SCHEMA.FIELDS.ASSINGMENTS.NOTES]: reviewNotes || undefined,
				}
			);
			assignmentRecordId = createdAssignment.id;
		}

		const releasedTrailerRecordIds = previousTrailerRecordIds.filter(
			(recordId) => recordId && recordId !== trailerRecordId
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
			trailerId: trailer.id,
			assignmentRecordId,
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
	const activeRentals = await getRentalsByIds(activeRentalRecordIds);
	const rentalsByRecordId = new Map(
		activeRentals.map((rental) => [rental.recordId, rental])
	);

	const activeAssignmentsByTrailerRecordId = new Map();
	for (const assignment of activeAssignments) {
		for (const trailerRecordId of assignment.trailerRecordIds) {
			const current = activeAssignmentsByTrailerRecordId.get(trailerRecordId) ?? [];
			current.push(assignment);
			activeAssignmentsByTrailerRecordId.set(trailerRecordId, current);
		}
	}

	return trailers.map((trailer) => ({
		trailerId: trailer.id,
		trailerType: trailer.trailerType,
		plateNumber: trailer.plateNumber,
		vin: trailer.vin,
		status: trailer.status,
		activeAssignmentCount:
			(activeAssignmentsByTrailerRecordId.get(trailer.recordId) ?? []).length,
		assignments: (activeAssignmentsByTrailerRecordId.get(trailer.recordId) ?? []).map(
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
	}));
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
