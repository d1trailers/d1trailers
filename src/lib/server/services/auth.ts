import { z } from "zod";
import { env, getStaffBootstrapEmails } from "@/lib/server/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
	getProfileByEmail,
	getTenantByPrimaryEmail,
} from "@/lib/server/repos/platform";

const emailSchema = z.string().trim().email();
const STAFF_BOOTSTRAP_EMAILS = new Set(getStaffBootstrapEmails());

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

async function isEligibleForLogin(email: string) {
	if (STAFF_BOOTSTRAP_EMAILS.has(email)) {
		return true;
	}

	const [profile, tenant] = await Promise.all([
		getProfileByEmail(email),
		getTenantByPrimaryEmail(email),
	]);

	return Boolean(profile || tenant);
}

export async function requestLoginLink(rawEmail: unknown) {
	const email = normalizeEmail(emailSchema.parse(rawEmail));
	const eligible = await isEligibleForLogin(email);

	console.log(`Email request made login_access to ${email}`);

	if (!eligible) {
		return { eligible: false };
	}

	const adminClient = createAdminClient();
	const { data, error } = await adminClient.auth.admin.generateLink({
		type: "magiclink",
		email,
		options: {
			redirectTo: `${env.APP_BASE_URL}/auth/callback`,
		},
	});

	if (error) {
		throw new Error(error.message);
	}

	const tokenHash = data?.properties?.hashed_token ?? null;
	const verificationType = data?.properties?.verification_type ?? "magiclink";
	const actionLink =
		tokenHash
			? `${env.APP_BASE_URL}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(
					verificationType === "magiclink" ? "email" : verificationType
			  )}`
			: data?.properties?.action_link ?? null;

	if (actionLink) {
		console.log("========== SUPABASE MAGIC LINK (TEMP MODE) ==========");
		console.log(actionLink);
		console.log("=====================================================");
	}

	return {
		eligible: true,
		actionLink,
	};
}
