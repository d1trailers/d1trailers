import { after } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email/mailer";
import { buildLoginLinkEmail } from "@/lib/email/templates";
import { env, getStaffBootstrapEmails } from "@/lib/server/env";
import { enforceRateLimits } from "@/lib/server/security/rateLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import {
	getProfileByEmail,
	getStaffMembershipByProfileId,
	getTenantMembershipsByProfileId,
	listPendingTenantInvitationsByEmail,
} from "@/lib/server/repos/platform";

const emailSchema = z.string().trim().email();
const STAFF_BOOTSTRAP_EMAILS = new Set(getStaffBootstrapEmails());
// Matches Supabase Auth's email OTP expiry (auth.email.otp_expiry, default 3600s).
const LOGIN_LINK_EXPIRY_MINUTES = 60;

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

async function isEligibleForLogin(email: string) {
	if (STAFF_BOOTSTRAP_EMAILS.has(email)) {
		return true;
	}

	const [profile, invitations] = await Promise.all([
		getProfileByEmail(email),
		listPendingTenantInvitationsByEmail(email),
	]);

	const activeInvitations = invitations.filter(
		(invitation) =>
			!invitation.expires_at || new Date(invitation.expires_at).getTime() >= Date.now()
	);

	if (activeInvitations.length) {
		return true;
	}

	if (!profile) {
		return false;
	}

	const [staffMembership, tenantMemberships] = await Promise.all([
		getStaffMembershipByProfileId(profile.id),
		getTenantMembershipsByProfileId(profile.id),
	]);

	return Boolean(staffMembership || tenantMemberships.length);
}

async function ensureAuthUser(email: string) {
	// Profiles mirror auth users 1:1 (handle_new_user trigger). Create the auth user
	// explicitly for first-time invitees so login never depends on public sign-ups
	// being enabled.
	if (await getProfileByEmail(email)) return;

	const { error } = await createAdminClient().auth.admin.createUser({
		email,
		email_confirm: true,
	});

	if (error && !/already|exists|registered/i.test(error.message)) {
		throw new Error(error.message);
	}
}

async function generateLoginUrl(email: string) {
	await ensureAuthUser(email);

	const { data, error } = await createAdminClient().auth.admin.generateLink({
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

	if (tokenHash) {
		const otpType = verificationType === "magiclink" ? "email" : verificationType;
		return `${env.APP_BASE_URL}/auth/callback?token_hash=${encodeURIComponent(
			tokenHash
		)}&type=${encodeURIComponent(otpType)}`;
	}

	return data?.properties?.action_link ?? null;
}

async function deliverLoginLink(email: string) {
	const loginUrl = await generateLoginUrl(email);
	if (!loginUrl) {
		console.error("Login link generation returned no link.");
		return;
	}

	const message = buildLoginLinkEmail({
		loginUrl,
		expiresInMinutes: LOGIN_LINK_EXPIRY_MINUTES,
	});
	// Sent directly (not through communication_events) so the link is never stored.
	const result = await sendEmail({ to: email, ...message });

	if (result.status === "sent") return;

	if (result.status === "skipped" && env.NODE_ENV === "development") {
		console.info(`[dev only] Email delivery is not configured. Login link: ${loginUrl}`);
		return;
	}

	console.error(`Login link email was not delivered (${result.status}): ${result.errorMessage}`);
}

/**
 * Starts a passwordless sign-in. Always resolves the same way regardless of whether the
 * email is eligible, so callers can't use it to discover registered accounts. The link
 * is only ever delivered by email.
 */
export async function requestLoginLink(
	rawEmail: unknown,
	options: { ip?: string | null } = {}
) {
	const email = normalizeEmail(emailSchema.parse(rawEmail));

	await enforceRateLimits([
		{ name: "login:email", identifier: email, windowSeconds: 15 * 60, max: 5 },
		{ name: "login:ip", identifier: options.ip, windowSeconds: 60 * 60, max: 20 },
	]);

	if (!(await isEligibleForLogin(email))) {
		return;
	}

	// Deliver after the response is sent so response timing doesn't reveal eligibility.
	after(async () => {
		try {
			await deliverLoginLink(email);
		} catch (error) {
			console.error(
				"Failed to deliver login link:",
				error instanceof Error ? error.message : error
			);
		}
	});
}
