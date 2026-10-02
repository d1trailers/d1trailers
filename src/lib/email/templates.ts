import { escapeHtml, escapeMultiline, safeUrl, sanitizeSubject } from "@/lib/email/html";

// Every interpolated value below comes from user or staff input and must be escaped
// with escapeHtml / escapeMultiline. Subjects go through sanitizeSubject.

function wrapHtml(content: string) {
	return `
		<div style="font-family: Arial, sans-serif; color: #171717; line-height: 1.6; max-width: 640px; margin: 0 auto; padding: 24px;">
			${content}
			<p style="margin-top: 24px;">D1Trailers</p>
		</div>
	`;
}

export function buildLoginLinkEmail(input: { loginUrl: string; expiresInMinutes: number }) {
	const subject = "Your D1Trailers sign-in link";
	const html = wrapHtml(`
		<p>Hello,</p>
		<p>Use the button below to sign in to your D1Trailers account. This link expires in ${escapeHtml(
			input.expiresInMinutes
		)} minutes and can only be used once.</p>
		<p style="margin: 24px 0;">
			<a href="${safeUrl(input.loginUrl)}" style="display: inline-block; background: #171717; color: #fafafa; padding: 12px 20px; border-radius: 12px; text-decoration: none; font-weight: bold;">Sign in to D1Trailers</a>
		</p>
		<p>If you didn't request this email, you can safely ignore it. Never share this link with anyone.</p>
	`);
	const text = [
		"Hello,",
		"",
		`Use this link to sign in to your D1Trailers account. It expires in ${input.expiresInMinutes} minutes and can only be used once:`,
		input.loginUrl,
		"",
		"If you didn't request this email, you can safely ignore it. Never share this link with anyone.",
		"",
		"D1Trailers",
	].join("\n");

	return { subject, html, text };
}

export function buildInterestReceivedEmail(input: {
	firstName: string;
	companyName: string;
}) {
	const subject = "Thanks for reaching out to D1Trailers";
	const html = wrapHtml(`
		<p>Hi ${escapeHtml(input.firstName)},</p>
		<p>Thank you for reaching out to D1Trailers${
			input.companyName ? ` on behalf of ${escapeHtml(input.companyName)}` : ""
		}.</p>
		<p>Our team has received your request and will review it shortly. Most initial reviews are handled within 1 to 2 business days.</p>
		<p>If we need additional details, we'll follow up directly.</p>
	`);
	const text = [
		`Hi ${input.firstName},`,
		"",
		`Thank you for reaching out to D1Trailers${
			input.companyName ? ` on behalf of ${input.companyName}` : ""
		}.`,
		"Our team has received your request and will review it shortly. Most initial reviews are handled within 1 to 2 business days.",
		"If we need additional details, we'll follow up directly.",
		"",
		"D1Trailers",
	].join("\n");

	return { subject, html, text };
}

export function buildApplicationReceivedEmail(input: {
	firstName: string;
	companyName: string;
}) {
	const subject = "Your D1Trailers account has been created";
	const html = wrapHtml(`
		<p>Hi ${escapeHtml(input.firstName)},</p>
		<p>We created your D1Trailers account${
			input.companyName ? ` for ${escapeHtml(input.companyName)}` : ""
		}.</p>
		<p>You can sign in with this email address to access your portal. From there, you can create rental requests and track updates from our team.</p>
		<p>Our team will review your submitted account details and documents. If anything else is needed, we'll follow up directly.</p>
	`);
	const text = [
		`Hi ${input.firstName},`,
		"",
		`We created your D1Trailers account${
			input.companyName ? ` for ${input.companyName}` : ""
		}.`,
		"You can sign in with this email address to access your portal. From there, you can create rental requests and track updates from our team.",
		"Our team will review your submitted account details and documents. If anything else is needed, we'll follow up directly.",
		"",
		"D1Trailers",
	].join("\n");

	return { subject, html, text };
}

export function buildApplicationApprovedEmail(input: {
	firstName: string;
	companyName: string;
}) {
	const subject = "Your D1Trailers application has been approved";
	const html = wrapHtml(`
		<p>Hi ${escapeHtml(input.firstName)},</p>
		<p>Your application${
			input.companyName ? ` for ${escapeHtml(input.companyName)}` : ""
		} has been approved.</p>
		<p>We'll be sharing the next steps with you shortly, including anything still needed before your rental can move forward.</p>
		<p>Thank you for working with D1Trailers.</p>
	`);
	const text = [
		`Hi ${input.firstName},`,
		"",
		`Your application${input.companyName ? ` for ${input.companyName}` : ""} has been approved.`,
		"We'll be sharing the next steps with you shortly, including anything still needed before your rental can move forward.",
		"Thank you for working with D1Trailers.",
		"",
		"D1Trailers",
	].join("\n");

	return { subject, html, text };
}

export function buildFeedbackRequestedEmail(input: {
	firstName: string;
	companyName: string;
	reviewNotes?: string | null;
}) {
	const subject = "Additional information is needed for your D1Trailers application";
	const html = wrapHtml(`
		<p>Hi ${escapeHtml(input.firstName)},</p>
		<p>We reviewed your application${
			input.companyName ? ` for ${escapeHtml(input.companyName)}` : ""
		} and need a bit more information before we can continue.</p>
		${
			input.reviewNotes
				? `<p><strong>Requested update:</strong><br />${escapeMultiline(input.reviewNotes)}</p>`
				: "<p>Our team will follow up with the specific details needed.</p>"
		}
		<p>Once the requested information is provided, we'll continue the review process.</p>
	`);
	const text = [
		`Hi ${input.firstName},`,
		"",
		`We reviewed your application${input.companyName ? ` for ${input.companyName}` : ""} and need a bit more information before we can continue.`,
		input.reviewNotes ? `Requested update: ${input.reviewNotes}` : "Our team will follow up with the specific details needed.",
		"Once the requested information is provided, we'll continue the review process.",
		"",
		"D1Trailers",
	].join("\n");

	return { subject, html, text };
}

export function buildTimelineUpdateEmail(input: {
	firstName: string;
	companyName: string;
	title: string;
	description?: string | null;
}) {
	const subject = sanitizeSubject(`Update from D1Trailers: ${input.title}`);
	const html = wrapHtml(`
		<p>Hi ${escapeHtml(input.firstName)},</p>
		<p>We posted a new update for${
			input.companyName ? ` ${escapeHtml(input.companyName)}` : " your account"
		}.</p>
		<p><strong>${escapeHtml(input.title)}</strong></p>
		${input.description ? `<p>${escapeMultiline(input.description)}</p>` : ""}
		<p>Sign in to your D1Trailers account to review the latest step in your timeline.</p>
	`);
	const text = [
		`Hi ${input.firstName},`,
		"",
		`We posted a new update for${input.companyName ? ` ${input.companyName}` : " your account"}.`,
		input.title,
		input.description || null,
		"Sign in to your D1Trailers account to review the latest step in your timeline.",
		"",
		"D1Trailers",
	]
		.filter(Boolean)
		.join("\n");

	return { subject, html, text };
}

export function buildTenantMessageEmail(input: {
	firstName: string;
	companyName: string;
	subjectLine: string;
	message: string;
}) {
	const subject = sanitizeSubject(`Update from D1Trailers: ${input.subjectLine}`);
	const html = wrapHtml(`
		<p>Hi ${escapeHtml(input.firstName)},</p>
		<p>We have an update for${
			input.companyName ? ` ${escapeHtml(input.companyName)}` : " your account"
		}.</p>
		<p><strong>${escapeHtml(input.subjectLine)}</strong></p>
		<p>${escapeMultiline(input.message)}</p>
		<p>If you have any questions, reply to this message or contact D1Trailers directly.</p>
	`);
	const text = [
		`Hi ${input.firstName},`,
		"",
		`We have an update for${input.companyName ? ` ${input.companyName}` : " your account"}.`,
		input.subjectLine,
		input.message,
		"If you have any questions, reply to this message or contact D1Trailers directly.",
		"",
		"D1Trailers",
	].join("\n");

	return { subject, html, text };
}

export function buildPortalAccessEmail(input: {
	tenantName: string;
	inviterName?: string | null;
	roleLabel: string;
}) {
	const subject = sanitizeSubject(
		`You have been invited to access ${input.tenantName} on D1Trailers`
	);
	const html = wrapHtml(`
		<p>Hello,</p>
		<p>You have been invited to access the <strong>${escapeHtml(
			input.tenantName
		)}</strong> account on D1Trailers as <strong>${escapeHtml(input.roleLabel)}</strong>.</p>
		${
			input.inviterName
				? `<p>This invitation was sent by ${escapeHtml(input.inviterName)}.</p>`
				: ""
		}
		<p>Use the D1Trailers login page with this email address to sign in. We&apos;ll guide you to the right account automatically.</p>
	`);
	const text = [
		"Hello,",
		"",
		`You have been invited to access the ${input.tenantName} account on D1Trailers as ${input.roleLabel}.`,
		input.inviterName ? `This invitation was sent by ${input.inviterName}.` : null,
		"Use the D1Trailers login page with this email address to sign in. We'll guide you to the right account automatically.",
		"",
		"D1Trailers",
	]
		.filter(Boolean)
		.join("\n");

	return { subject, html, text };
}
