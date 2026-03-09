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
