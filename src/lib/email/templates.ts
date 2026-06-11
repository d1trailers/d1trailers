function wrapHtml(content: string) {
	return `
		<div style="font-family: Arial, sans-serif; color: #171717; line-height: 1.6; max-width: 640px; margin: 0 auto; padding: 24px;">
			${content}
			<p style="margin-top: 24px;">D1Trailers</p>
		</div>
	`;
}

export function buildInterestReceivedEmail(input: {
	firstName: string;
	companyName: string;
}) {
	const subject = "Thanks for reaching out to D1Trailers";
	const html = wrapHtml(`
		<p>Hi ${input.firstName},</p>
		<p>Thank you for reaching out to D1Trailers${
			input.companyName ? ` on behalf of ${input.companyName}` : ""
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
	const subject = "Your D1Trailers application was received";
	const html = wrapHtml(`
		<p>Hi ${input.firstName},</p>
		<p>We received your rental application${
			input.companyName ? ` for ${input.companyName}` : ""
		}.</p>
		<p>Our team will review the submission and contact you if anything else is needed. Most application reviews are completed within 48 hours.</p>
		<p>We'll keep you updated as the application moves forward.</p>
	`);
	const text = [
		`Hi ${input.firstName},`,
		"",
		`We received your rental application${
			input.companyName ? ` for ${input.companyName}` : ""
		}.`,
		"Our team will review the submission and contact you if anything else is needed. Most application reviews are completed within 48 hours.",
		"We'll keep you updated as the application moves forward.",
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
		<p>Hi ${input.firstName},</p>
		<p>Your application${input.companyName ? ` for ${input.companyName}` : ""} has been approved.</p>
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
		<p>Hi ${input.firstName},</p>
		<p>We reviewed your application${input.companyName ? ` for ${input.companyName}` : ""} and need a bit more information before we can continue.</p>
		${
			input.reviewNotes
				? `<p><strong>Requested update:</strong><br />${input.reviewNotes}</p>`
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
	const subject = `Update from D1Trailers: ${input.title}`;
	const html = wrapHtml(`
		<p>Hi ${input.firstName},</p>
		<p>We posted a new update for${input.companyName ? ` ${input.companyName}` : " your account"}.</p>
		<p><strong>${input.title}</strong></p>
		${input.description ? `<p>${input.description}</p>` : ""}
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

export function buildPortalAccessEmail(input: {
	tenantName: string;
	inviterName?: string | null;
	roleLabel: string;
}) {
	const subject = `You have been invited to access ${input.tenantName} on D1Trailers`;
	const html = wrapHtml(`
		<p>Hello,</p>
		<p>You have been invited to access the <strong>${input.tenantName}</strong> account on D1Trailers as <strong>${input.roleLabel}</strong>.</p>
		${
			input.inviterName
				? `<p>This invitation was sent by ${input.inviterName}.</p>`
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

