import Airtable from "airtable";
import { buildApplicationIntakeSummary } from "@/lib/applicationNotes";

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
		APPLICATION_INTAKE_SUMMARY: "Application Intake Summary",
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
	["ssn", "SSN"],
];

const APPLICATION_ATTACHMENT_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const APPLICATION_ATTACHMENT_ALLOWED_TYPES = new Set([
	"application/pdf",
	"image/jpeg",
	"image/png",
	"image/webp",
]);
const APPLICATION_ATTACHMENT_ALLOWED_EXTENSIONS = [
	".pdf",
	".jpg",
	".jpeg",
	".png",
	".webp",
];
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

function digitsOnly(value) {
	return String(value ?? "").replace(/\D/g, "");
}

function formatPhoneNumber(value) {
	const digits = digitsOnly(value);
	if (digits.length !== 10) return String(value ?? "").trim();
	return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatEin(value) {
	const digits = digitsOnly(value);
	if (digits.length !== 9) return String(value ?? "").trim();
	return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

function formatSsn(value) {
	const digits = digitsOnly(value);
	if (digits.length !== 9) return String(value ?? "").trim();
	return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function isAllowedApplicationFile(file) {
	const mimeType = String(file?.type ?? "").trim().toLowerCase();
	if (mimeType && APPLICATION_ATTACHMENT_ALLOWED_TYPES.has(mimeType)) {
		return true;
	}

	const filename = String(file?.name ?? "").trim().toLowerCase();
	return APPLICATION_ATTACHMENT_ALLOWED_EXTENSIONS.some((extension) =>
		filename.endsWith(extension)
	);
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
		phone: formatPhoneNumber(applicationInput.phone),
		ownerAddress: String(applicationInput.ownerAddress ?? "").trim(),
		ownerCity: String(applicationInput.ownerCity ?? "").trim(),
		ownerRegion: String(applicationInput.ownerRegion ?? "").trim(),
		ownerZip: String(applicationInput.ownerZip ?? "").trim(),
		companyName: String(applicationInput.companyName ?? "").trim(),
		companyAddress: String(applicationInput.companyAddress ?? "").trim(),
		companyCity: String(applicationInput.companyCity ?? "").trim(),
		companyRegion: String(applicationInput.companyRegion ?? "").trim(),
		companyZip: String(applicationInput.companyZip ?? "").trim(),
		ein: formatEin(applicationInput.ein),
		mcNumber: digitsOnly(applicationInput.mcNumber),
		usdot: digitsOnly(applicationInput.usdot),
		rentalDuration: String(applicationInput.rentalDuration ?? "").trim(),
		ref1Name: String(applicationInput.ref1Name ?? "").trim(),
		ref1Phone: formatPhoneNumber(applicationInput.ref1Phone),
		ref2Name: String(applicationInput.ref2Name ?? "").trim(),
		ref2Phone: formatPhoneNumber(applicationInput.ref2Phone),
		ref3Name: String(applicationInput.ref3Name ?? "").trim(),
		ref3Phone: formatPhoneNumber(applicationInput.ref3Phone),
		ssn: formatSsn(applicationInput.ssn),
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

	if (!/^\d{3}-\d{3}-\d{4}$/.test(normalizedApplication.phone)) {
		throw new Error("Phone must be a valid 10-digit number in the format 123-456-7890.");
	}

	if (!/^\d{2}-\d{7}$/.test(normalizedApplication.ein)) {
		throw new Error("Federal Tax ID (EIN) must be in the format 12-3456789.");
	}

	if (!/^\d{4,10}$/.test(normalizedApplication.mcNumber)) {
		throw new Error("MC Number must be between 4 and 10 digits.");
	}

	if (!/^\d{4,9}$/.test(normalizedApplication.usdot)) {
		throw new Error("USDOT Number must be between 4 and 9 digits.");
	}

	if (!/^\d{3}-\d{2}-\d{4}$/.test(normalizedApplication.ssn)) {
		throw new Error("SSN must be in the format 123-45-6789.");
	}

	for (const [fieldName, label] of [
		["ref1Phone", "Reference phone 1"],
		["ref2Phone", "Reference phone 2"],
		["ref3Phone", "Reference phone 3"],
	]) {
		const value = normalizedApplication[fieldName];
		if (value && !/^\d{3}-\d{3}-\d{4}$/.test(value)) {
			throw new Error(`${label} must be a valid 10-digit number in the format 123-456-7890.`);
		}
	}

	for (const [fieldName, config] of Object.entries(APPLICATION_DOCUMENT_FIELDS)) {
		const file = filesByFieldName[fieldName];
		if (!file || typeof file.arrayBuffer !== "function" || !file.size) {
			throw new Error(`${config.label} is required.`);
		}
		if (typeof file.size === "number" && file.size > APPLICATION_ATTACHMENT_MAX_SIZE_BYTES) {
			throw new Error(`${config.label} must be 5 MB or smaller.`);
		}
		if (!isAllowedApplicationFile(file)) {
			throw new Error(
				`${config.label} must be uploaded as a PDF, JPG, PNG, or WebP file.`
			);
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
		[FIELDS.CUSTOMERS.APPLICATION_INTAKE_SUMMARY]:
			buildApplicationIntakeSummary(normalizedApplication),
		[FIELDS.CUSTOMERS.SUBMITTED_AT]: submittedAt,
	});

	const rentalRecord = await createRecord(TABLES.RENTALS, {
		[FIELDS.RENTALS.CUSTOMER]: [customerRecord.id],
		[FIELDS.RENTALS.STATUS]: "Submitted",
		[FIELDS.RENTALS.BILLING_FREQUENCY]: "Monthly",
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
