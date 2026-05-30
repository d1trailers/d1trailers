import { z } from "zod";

const phonePattern = /^\d{3}-\d{3}-\d{4}$/;
const einPattern = /^\d{2}-\d{7}$/;
const ssnPattern = /^\d{3}-\d{2}-\d{4}$/;
const numericPattern = /^\d+$/;

export const requiredApplicationDocumentFields = [
	"utilityBill1",
	"utilityBill2",
	"licenseFront",
	"licenseBack",
	"tractorPlate",
] as const;

export type RequiredApplicationDocumentField =
	(typeof requiredApplicationDocumentFields)[number];

export const applicationDocumentTypes: Record<
	RequiredApplicationDocumentField,
	{ label: string; documentType: string; category: string }
> = {
	utilityBill1: {
		label: "Utility Bill (1 of 2)",
		documentType: "utility_bill",
		category: "identity_support",
	},
	utilityBill2: {
		label: "Utility Bill (2 of 2)",
		documentType: "utility_bill",
		category: "identity_support",
	},
	licenseFront: {
		label: "Driver License (Front)",
		documentType: "license_front",
		category: "identity",
	},
	licenseBack: {
		label: "Driver License (Back)",
		documentType: "license_back",
		category: "identity",
	},
	tractorPlate: {
		label: "Tractor License Plate Photo",
		documentType: "tractor_plate",
		category: "equipment",
	},
};

export const applicationSubmissionSchema = z.object({
	ownerFirstName: z.string().trim().min(1).max(80),
	ownerLastName: z.string().trim().min(1).max(80),
	partnerFirstName: z.string().trim().max(80).optional().default(""),
	partnerLastName: z.string().trim().max(80).optional().default(""),
	email: z.string().trim().email(),
	phone: z.string().trim().regex(phonePattern, "Phone must be 123-456-7890."),
	ownerAddress: z.string().trim().max(160).optional().default(""),
	ownerCity: z.string().trim().max(80).optional().default(""),
	ownerRegion: z.string().trim().max(80).optional().default(""),
	ownerZip: z.string().trim().max(20).optional().default(""),
	companyName: z.string().trim().min(1).max(160),
	companyAddress: z.string().trim().max(160).optional().default(""),
	companyCity: z.string().trim().max(80).optional().default(""),
	companyRegion: z.string().trim().max(80).optional().default(""),
	companyZip: z.string().trim().max(20).optional().default(""),
	ein: z.string().trim().regex(einPattern, "EIN must be 12-3456789."),
	mcNumber: z
		.string()
		.trim()
		.min(4)
		.max(10)
		.regex(numericPattern, "MC Number must be numeric."),
	usdot: z
		.string()
		.trim()
		.min(4)
		.max(9)
		.regex(numericPattern, "USDOT Number must be numeric."),
	rentalDuration: z.string().trim().min(1).max(160),
	ref1Name: z.string().trim().max(80).optional().default(""),
	ref1Phone: z
		.string()
		.trim()
		.refine((value) => !value || phonePattern.test(value), {
			message: "Reference phone must be 123-456-7890.",
		})
		.optional()
		.default(""),
	ref2Name: z.string().trim().max(80).optional().default(""),
	ref2Phone: z
		.string()
		.trim()
		.refine((value) => !value || phonePattern.test(value), {
			message: "Reference phone must be 123-456-7890.",
		})
		.optional()
		.default(""),
	ref3Name: z.string().trim().max(80).optional().default(""),
	ref3Phone: z
		.string()
		.trim()
		.refine((value) => !value || phonePattern.test(value), {
			message: "Reference phone must be 123-456-7890.",
		})
		.optional()
		.default(""),
	ssn: z.string().trim().regex(ssnPattern, "SSN must be 123-45-6789."),
	ssnAuth: z.boolean().refine(Boolean, "SSN authorization is required."),
	insurance: z.boolean().refine(Boolean, "Insurance agreement is required."),
	maintenance: z.boolean().refine(Boolean, "Maintenance agreement is required."),
});

export type ApplicationSubmissionInput = z.infer<
	typeof applicationSubmissionSchema
>;
