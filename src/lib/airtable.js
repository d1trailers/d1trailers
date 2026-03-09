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

function enrichRentalsForAdmin(rentals, customers, trailers) {
	const customersByRecordId = new Map(
		customers.map((customer) => [customer.recordId, customer])
	);
	const trailersByRecordId = new Map(
		trailers.map((trailer) => [trailer.recordId, trailer])
	);

	return rentals.map((rental) => {
		const customerNames = rental.customerRecordIds
			.map((recordId) => customersByRecordId.get(recordId)?.companyName)
			.filter(Boolean);

		const rentalTrailers = rental.trailerRecordIds
			.map((recordId) => trailersByRecordId.get(recordId))
			.filter(Boolean)
			.map(publicTrailerView);

		return {
			rentalId: rental.id,
			customerName: customerNames[0] ?? "Unknown Customer",
			status: rental.status,
			billingFrequency: rental.billingFrequency,
			rate: rental.rate,
			depositAmount: rental.depositAmount,
			currentPeriodEnd: rental.currentPeriodEnd,
			billingStatus: rental.billingStatus,
			trailers: rentalTrailers,
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
			assignments: rentalAssignments.map((assignment) => ({
				assignmentId: assignment.id,
				startDate: assignment.startDate,
				endDate: assignment.endDate,
				status: assignment.status,
				notes: assignment.notes,
				trailers: assignment.trailerRecordIds
					.map((recordId) => trailersByRecordId.get(recordId))
					.filter(Boolean)
					.map(mapAdminTrailerOption),
			})),
			documents: documentsByRentalRecordId.get(rental.recordId) ?? [],
		};
	});

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

		if (trailer.status !== "Available") {
			throw new ApplicationDecisionError(
				"CONFLICT",
				`Trailer ${trailer.id || trailer.recordId} is currently ${trailer.status || "unavailable"}.`
			);
		}

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

		return {
			customerId: customer.id,
			action,
			customerStatus: actionOutcome.customerStatus,
			rentalStatus: actionOutcome.rentalStatus,
			rentalId: targetRental.id,
			trailerId: trailer.id,
			reviewedAt,
		};
	}

	const rentalsToUpdate = rentals.filter((rental) =>
		APPLICATION_REVIEW_RENTAL_STATUSES.has(rental.status)
	);
	const targetRentals = rentalsToUpdate.length ? rentalsToUpdate : rentals;

	await Promise.all([
		...targetRentals.map((rental) =>
			updateRecordById(AIRTABLE_SCHEMA.TABLES.RENTALS, rental.recordId, {
				[AIRTABLE_SCHEMA.FIELDS.RENTALS.STATUS]: actionOutcome.rentalStatus,
			})
		),
		updateRecordById(
			AIRTABLE_SCHEMA.TABLES.CUSTOMERS,
			customer.recordId,
			customerUpdateFields
		),
	]);

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

	const customerRecordIds = Array.from(
		new Set(rentals.flatMap((rental) => rental.customerRecordIds))
	);
	const trailerRecordIds = Array.from(
		new Set(rentals.flatMap((rental) => rental.trailerRecordIds))
	);

	const [customers, trailers] = await Promise.all([
		getCustomersByIds(customerRecordIds),
		getTrailersByIds(trailerRecordIds),
	]);

	return enrichRentalsForAdmin(rentals, customers, trailers);
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
		getAssignmentsByStatuses(["Active"]),
	]);

	const activeAssignmentsByTrailerRecordId = new Map();
	for (const assignment of activeAssignments) {
		for (const trailerRecordId of assignment.trailerRecordIds) {
			const current = activeAssignmentsByTrailerRecordId.get(trailerRecordId) ?? 0;
			activeAssignmentsByTrailerRecordId.set(trailerRecordId, current + 1);
		}
	}

	return trailers.map((trailer) => ({
		trailerId: trailer.id,
		trailerType: trailer.trailerType,
		plateNumber: trailer.plateNumber,
		vin: trailer.vin,
		status: trailer.status,
		activeAssignmentCount:
			activeAssignmentsByTrailerRecordId.get(trailer.recordId) ?? 0,
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
