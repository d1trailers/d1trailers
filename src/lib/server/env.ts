import { z } from "zod";

const envSchema = z.object({
	NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
	NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
	SUPABASE_SECRET_KEY: z.string().min(1),
	APP_BASE_URL: z.string().url(),
	RESEND_API_KEY: z.string().min(1).optional().or(z.literal("")),
	RESEND_FROM_EMAIL: z.string().email().optional().or(z.literal("")),
	STAFF_BOOTSTRAP_EMAILS: z.string().optional().default(""),
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsedEnv = envSchema.safeParse({
	NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
	NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
	APP_BASE_URL: process.env.APP_BASE_URL,
	RESEND_API_KEY: process.env.RESEND_API_KEY,
	RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
	STAFF_BOOTSTRAP_EMAILS: process.env.STAFF_BOOTSTRAP_EMAILS,
	NODE_ENV: process.env.NODE_ENV,
});

if (!parsedEnv.success) {
	console.error("Environment validation failed:", parsedEnv.error.flatten());
	throw new Error("Invalid environment configuration.");
}

export const env = parsedEnv.data;

export function getStaffBootstrapEmails() {
	return env.STAFF_BOOTSTRAP_EMAILS.split(",")
		.map((email) => email.trim().toLowerCase())
		.filter(Boolean);
}

export function isResendConfigured() {
	return Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL);
}
