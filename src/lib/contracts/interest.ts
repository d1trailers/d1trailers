import { z } from "zod";

const phonePattern = /^(\d{3}-\d{3}-\d{4}|\d{10})$/;

export const interestSubmissionSchema = z.object({
	firstName: z.string().trim().min(1).max(80),
	lastName: z.string().trim().min(1).max(80),
	email: z.string().trim().email(),
	phone: z
		.string()
		.trim()
		.min(1)
		.max(20)
		.refine((value) => phonePattern.test(value.replace(/\D/g, "")) || phonePattern.test(value), {
			message: "Phone must be a valid 10-digit number.",
		}),
	companyName: z.string().trim().min(1).max(160),
	duration: z.string().trim().min(1).max(160),
	typeOfUse: z.enum(["Transport", "Storage"]),
	referral: z.string().trim().max(160).optional().default(""),
});

export type InterestSubmissionInput = z.infer<typeof interestSubmissionSchema>;
