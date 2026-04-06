import Airtable from "airtable";
import {
	buildApplicationIntakeSummary,
	composeCustomerNotes,
} from "@/lib/applicationNotes";

const TABLES = {
	CUSTOMERS: "Customers",
	RENTALS: "Rentals",
	DOCUMENTS: "Documents",
};

const FIELDS = {
	CUSTOMERS: {
		COMPANY_NAME: "Company Name",
		PRIMARY_EMAIL: "Primary Email",
		STATUS: "Status",
		REVIEW_NOTES: "Review Notes",
		SUBMITTED_AT: "Submitted At",
	},
	RENTALS: {
		CUSTOMER: "Customer",
		STATUS: "Status",
		BILLING_FREQUENCY: "Billing Frequency",
	},
	DOCUMENTS: {
		CUSTOMER: "Customer",
		RENTAL: "Rental",
		CATEGORY: "Category",
		TYPE: "Type",
		ATTACHMENT: "Attachment",
	},
};

export const APPLICATION_DOCUMENT_FIELDS = {
	utilityBill1: { label: "Utility Bill (1 of 2)", type: "Utility Bill" },
	utilityBill2: { label: "Utility Bill (2 of 2)", type: "Utility Bill" },
	licenseFront: { label: "Driver License (Front)", type: "Liscence Front" },
	licenseBack: { label: "Driver License (Back)", type: "Liscence Back" },
	tractorPlate: { label: "Tractor License Plate Photo", type: "Tractor Plate" },
};

const REQUIRED_TEXT_FIELDS = [
	["ownerFirstName", "Principal owner first name"],
	["ownerLastName", "Principal owner last name"],
	["email", "Email"],
	["phone", "Phone"],
	["companyName", "Company name"],
	["ein", "Federal Tax ID (EIN)"],
	["mcNumber", "MC Number"],
	["usdot", "USDOT Number"],
	["rentalDuration", "Duration of rental"],
	["ssn", "SSN"],
];

const APPLICATION_ATTACHMENT_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

const base =
	AIRTABLE_API_KEY && AIRTABLE_BASE_ID
		? new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID)
		: null;

function assertBase() {
	if (!base || !AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
		throw new Error("Airtable is not configured");
	}
}

function normalizeEmail(email) {
	return String(email ?? "").trim().toLowerCase();
}

function sanitizeFields(fields) {
	return Object.fromEntries(
		Object.entries(fields).filter(([, value]) => value !== undefined)
	);
}

async function createRecord(tableName, fields) {
	assertBase();
	return base(tableName).create(sanitizeFields(fields));
}

async function findCustomerByEmail(email) {
	assertBase();
	const normalizedEmail = normalizeEmail(email);
	if (!normalizedEmail) return null;

	const safeEmail = normalizedEmail
		.replace(/\\/g, "\\\\")
		.replace(/'/g, "\\'");

	const records = await base(TABLES.CUSTOMERS)
		.select({
			maxRecords: 1,
			filterByFormula: `LOWER({${FIELDS.CUSTOMERS.PRIMARY_EMAIL}}) = '${safeEmail}'`,
		})
		.firstPage();

	return records[0] ?? null;
}

function inferBillingFrequencyFromDuration(value) {
	const normalizedValue = typeof value === "string" ? value.trim().toLowerCase() : "";
	if (!normalizedValue) return undefined;
	if (normalizedValue.includes("week")) return "Weekly";
	if (normalizedValue.includes("month")) return "Monthly";
	if (normalizedValue.includes("year") || normalizedValue.includes("annual")) {
		return "Yearly";
	}
	return undefined;
}

async function uploadAttachmentToAirtable(recordId, fieldName, file) {
	assertBase();
	if (typeof file.size === "number" && file.size > APPLICATION_ATTACHMENT_MAX_SIZE_BYTES) {
		throw new Error(`${file.name || "Attachment"} exceeds the 5 MB Airtable upload limit for direct uploads.`);
	}

	const arrayBuffer = await file.arrayBuffer();
	const response = await fetch(
		`https://content.airtable.com/v0/${AIRTABLE_BASE_ID}/${recordId}/${encodeURIComponent(fieldName)}/uploadAttachment`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${AIRTABLE_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				contentType: file.type || "application/octet-stream",
				filename: file.name || "upload.bin",
				file: Buffer.from(arrayBuffer).toString("base64"),
			}),
		}
	);

	if (!response.ok) {
		const errorBody = await response.text().catch(() => "");
		throw new Error(
			`Failed to upload ${file.name || "attachment"} to Airtable.${errorBody ? ` ${errorBody}` : ""}`
		);
	}

	return response.json().catch(() => null);
}

function normalizeApplicationInput(applicationInput = {}) {
	return {
		ownerFirstName: String(applicationInput.ownerFirstName ?? "").trim(),
		ownerLastName: String(applicationInput.ownerLastName ?? "").trim(),
		partnerFirstName: String(applicationInput.partnerFirstName ?? "").trim(),
		partnerLastName: String(applicationInput.partnerLastName ?? "").trim(),
		email: normalizeEmail(applicationInput.email),
		phone: String(applicationInput.phone ?? "").trim(),
		ownerAddress: String(applicationInput.ownerAddress ?? "").trim(),
		ownerCity: String(applicationInput.ownerCity ?? "").trim(),
		ownerRegion: String(applicationInput.ownerRegion ?? "").trim(),
		ownerZip: String(applicationInput.ownerZip ?? "").trim(),
		companyName: String(applicationInput.companyName ?? "").trim(),
		companyAddress: String(applicationInput.companyAddress ?? "").trim(),
		companyCity: String(applicationInput.companyCity ?? "").trim(),
		companyRegion: String(applicationInput.companyRegion ?? "").trim(),
		companyZip: String(applicationInput.companyZip ?? "").trim(),
		ein: String(applicationInput.ein ?? "").trim(),
		mcNumber: String(applicationInput.mcNumber ?? "").trim(),
		usdot: String(applicationInput.usdot ?? "").trim(),
		rentalDuration: String(applicationInput.rentalDuration ?? "").trim(),
		ref1Name: String(applicationInput.ref1Name ?? "").trim(),
		ref1Phone: String(applicationInput.ref1Phone ?? "").trim(),
		ref2Name: String(applicationInput.ref2Name ?? "").trim(),
		ref2Phone: String(applicationInput.ref2Phone ?? "").trim(),
		ref3Name: String(applicationInput.ref3Name ?? "").trim(),
		ref3Phone: String(applicationInput.ref3Phone ?? "").trim(),
		ssn: String(applicationInput.ssn ?? "").trim(),
		ssnAuth: Boolean(applicationInput.ssnAuth),
		insurance: Boolean(applicationInput.insurance),
		maintenance: Boolean(applicationInput.maintenance),
	};
}

function validateApplication(normalizedApplication, filesByFieldName) {
	for (const [fieldName, label] of REQUIRED_TEXT_FIELDS) {
		if (!normalizedApplication[fieldName]) {
			throw new Error(`${label} is required.`);
		}
	}

	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedApplication.email)) {
		throw new Error("A valid email address is required.");
	}

	for (const [fieldName, config] of Object.entries(APPLICATION_DOCUMENT_FIELDS)) {
		const file = filesByFieldName[fieldName];
		if (!file || typeof file.arrayBuffer !== "function" || !file.size) {
			throw new Error(`${config.label} is required.`);
		}
	}

	if (!normalizedApplication.ssnAuth || !normalizedApplication.insurance || !normalizedApplication.maintenance) {
		throw new Error(
			"All agreement checkboxes must be accepted before submitting the application."
		);
	}
}

export async function createApplicationSubmission(applicationInput = {}, filesByFieldName = {}) {
	assertBase();
	const normalizedApplication = normalizeApplicationInput(applicationInput);
	validateApplication(normalizedApplication, filesByFieldName);

	const existingCustomer = await findCustomerByEmail(normalizedApplication.email);
	if (existingCustomer) {
		throw new Error(
			"An application already exists for this email. Contact D1 Trailers if you need help with your existing request."
		);
	}

	const submittedAt = new Date().toISOString();
	const customerRecord = await createRecord(TABLES.CUSTOMERS, {
		[FIELDS.CUSTOMERS.COMPANY_NAME]: normalizedApplication.companyName,
		[FIELDS.CUSTOMERS.PRIMARY_EMAIL]: normalizedApplication.email,
		[FIELDS.CUSTOMERS.STATUS]: "Submitted",
		[FIELDS.CUSTOMERS.REVIEW_NOTES]: composeCustomerNotes({
			applicationIntakeSummary: buildApplicationIntakeSummary(normalizedApplication),
			reviewNotes: null,
		}),
		[FIELDS.CUSTOMERS.SUBMITTED_AT]: submittedAt,
	});

	const rentalRecord = await createRecord(TABLES.RENTALS, {
		[FIELDS.RENTALS.CUSTOMER]: [customerRecord.id],
		[FIELDS.RENTALS.STATUS]: "Submitted",
		[FIELDS.RENTALS.BILLING_FREQUENCY]: inferBillingFrequencyFromDuration(
			normalizedApplication.rentalDuration
		),
	});

	const uploadedDocuments = [];
	for (const [fieldName, config] of Object.entries(APPLICATION_DOCUMENT_FIELDS)) {
		const file = filesByFieldName[fieldName];
		const documentRecord = await createRecord(TABLES.DOCUMENTS, {
			[FIELDS.DOCUMENTS.CUSTOMER]: [customerRecord.id],
			[FIELDS.DOCUMENTS.RENTAL]: [rentalRecord.id],
			[FIELDS.DOCUMENTS.CATEGORY]: "Application",
			[FIELDS.DOCUMENTS.TYPE]: config.type,
		});

		await uploadAttachmentToAirtable(
			documentRecord.id,
			FIELDS.DOCUMENTS.ATTACHMENT,
			file
		);

		uploadedDocuments.push({
			recordId: documentRecord.id,
			filename: file.name || null,
			type: config.type,
		});
	}

	return {
		customerRecordId: customerRecord.id,
		rentalRecordId: rentalRecord.id,
		companyName: normalizedApplication.companyName,
		email: normalizedApplication.email,
		documentsCreated: uploadedDocuments.length,
	};
}
