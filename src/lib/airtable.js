import Airtable from "airtable";

const PORTAL_ELIGIBLE_STATUSES = new Set(["Active", "Past Due", "Suspended"]);

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
		id: record.get("Customer ID") ?? record.id,
		recordId: record.id,
		companyName: record.get("Company Name") ?? null,
		primaryEmail: record.get("Primary Email") ?? null,
		status: record.get("Status") ?? null,
		stripeCustomerId: record.get("Stripe Customer ID") ?? null,
	};
}

function normalizeTrailerRecord(record) {
	return {
		id: record.get("Trailer ID") ?? record.id,
		recordId: record.id,
		trailerType: record.get("Trailer Type") ?? null,
		plateNumber: record.get("Plate Number") ?? null,
		vin: record.get("VIN") ?? null,
		status: record.get("Status") ?? null,
	};
}

function normalizeDocumentRecord(record) {
	return {
		id: record.get("Document ID") ?? record.id,
		recordId: record.id,
		select: record.get("Select") ?? null,
		uploadedAt: record.get("Uploaded At") ?? null,
		attachments: normalizeAttachments(record.get("Attachment")),
		rentalIds: record.get("Rental") ?? [],
		customerIds: record.get("Customer") ?? [],
	};
}

function normalizeRentalRecord(record, trailersByRecordId, documentsByRentalRecordId) {
	const trailerRecordIds = record.get("Trailer") ?? [];
	const trailers = trailerRecordIds
		.map((recordId) => trailersByRecordId.get(recordId))
		.filter(Boolean);

	return {
		id: record.get("Rental ID") ?? record.id,
		recordId: record.id,
		status: record.get("Status") ?? null,
		startDate: record.get("Start Date") ?? null,
		endDate: record.get("End Date") ?? null,
		billingFrequency: record.get("Billing Frequency") ?? null,
		rate: record.get("Rate") ?? null,
		currentPeriodEnd: record.get("Current Period End") ?? null,
		billingStatus: record.get("Billing Status") ?? null,
		stripe: {
			subscriptionId: record.get("Stripe Subscription ID") ?? null,
			priceId: record.get("Stripe Price ID") ?? null,
			productId: record.get("Stripe Product ID") ?? null,
			lastInvoiceId: record.get("Last Invoice ID") ?? null,
		},
		trailers,
		documents: documentsByRentalRecordId.get(record.id) ?? [],
	};
}

export function isPortalEligibleCustomerStatus(status) {
	return PORTAL_ELIGIBLE_STATUSES.has(status);
}

export async function getCustomerByEmail(email) {
	assertBase();
	const normalizedEmail = normalizeEmail(email);

	if (!normalizedEmail) return null;

	const records = await base("Customers")
		.select({
			filterByFormula: `LOWER({Primary Email}) = '${escapeFormulaValue(
				normalizedEmail
			)}'`,
			maxRecords: 1,
		})
		.firstPage();

	if (!records.length) return null;

	return normalizeCustomerRecord(records[0]);
}

async function getRentalsByCustomerRecordId(customerRecordId) {
	assertBase();
	if (!customerRecordId) return [];

	return base("Rentals")
		.select({
			filterByFormula: `FIND('${escapeFormulaValue(
				customerRecordId
			)}', ARRAYJOIN({Customer}))`,
		})
		.all();
}

async function getTrailersByRecordIds(recordIds) {
	assertBase();
	if (!recordIds.length) return new Map();

	const conditions = recordIds.map(
		(recordId) => `RECORD_ID() = '${escapeFormulaValue(recordId)}'`
	);

	const filterByFormula =
		conditions.length === 1 ? conditions[0] : `OR(${conditions.join(",")})`;

	const records = await base("Trailers")
		.select({
			filterByFormula,
		})
		.all();

	return new Map(
		records.map((record) => [record.id, normalizeTrailerRecord(record)])
	);
}

async function getDocumentsByCustomerRecordId(customerRecordId) {
	assertBase();
	if (!customerRecordId) return [];

	return base("Documents")
		.select({
			filterByFormula: `FIND('${escapeFormulaValue(
				customerRecordId
			)}', ARRAYJOIN({Customer}))`,
		})
		.all();
}

export async function getPortalDataByEmail(email) {
	const customer = await getCustomerByEmail(email);

	if (!customer) return null;

	const [rentalRecords, documentRecords] = await Promise.all([
		getRentalsByCustomerRecordId(customer.recordId),
		getDocumentsByCustomerRecordId(customer.recordId),
	]);

	const trailerRecordIds = Array.from(
		new Set(
			rentalRecords.flatMap((record) =>
				Array.isArray(record.get("Trailer")) ? record.get("Trailer") : []
			)
		)
	);

	const trailersByRecordId = await getTrailersByRecordIds(trailerRecordIds);
	const normalizedDocuments = documentRecords.map(normalizeDocumentRecord);

	const documentsByRentalRecordId = new Map();
	for (const document of normalizedDocuments) {
		for (const rentalRecordId of document.rentalIds) {
			const existing = documentsByRentalRecordId.get(rentalRecordId) ?? [];
			existing.push(document);
			documentsByRentalRecordId.set(rentalRecordId, existing);
		}
	}

	const normalizedRentals = rentalRecords.map((record) =>
		normalizeRentalRecord(record, trailersByRecordId, documentsByRentalRecordId)
	);

	return {
		customer: {
			id: customer.id,
			companyName: customer.companyName,
			primaryEmail: customer.primaryEmail,
			status: customer.status,
		},
		rentals: normalizedRentals,
		documents: normalizedDocuments,
	};
}
