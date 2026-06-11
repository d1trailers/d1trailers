import { requireAdminApiSession } from "@/lib/adminApi";
import { buildTenantMessageEmail } from "@/lib/email/templates";
import { getAdminTenantManagementDetail } from "@/lib/server/services/dashboard";
import { sendTransactionalEmail } from "@/lib/server/services/communications";

function getFirstName(detail) {
	return (
		detail?.currentApplication?.owner_first_name ||
		String(detail?.currentApplication?.payload?.ownerFirstName || "").trim() ||
		"there"
	);
}

export async function POST(req, { params }) {
	const auth = await requireAdminApiSession();
	if (auth.error) return auth.error;

	const resolvedParams = await params;
	const tenantId =
		typeof resolvedParams?.tenantId === "string" ? resolvedParams.tenantId : "";

	if (!tenantId) {
		return Response.json({ error: "Tenant ID is required." }, { status: 400 });
	}

	let body = {};
	try {
		body = await req.json();
	} catch {
		body = {};
	}

	const subjectLine =
		typeof body?.subjectLine === "string" ? body.subjectLine.trim() : "";
	const message = typeof body?.message === "string" ? body.message.trim() : "";
	const applicationId =
		typeof body?.applicationId === "string" ? body.applicationId : null;

	if (!subjectLine || !message) {
		return Response.json(
			{ error: "A subject and message are required." },
			{ status: 400 },
		);
	}

	try {
		const detail = await getAdminTenantManagementDetail(tenantId);
		if (!detail) {
			return Response.json({ error: "Tenant not found." }, { status: 404 });
		}

		const email = buildTenantMessageEmail({
			firstName: getFirstName(detail),
			companyName: detail.tenant.display_name,
			subjectLine,
			message,
		});

		await sendTransactionalEmail({
			type: "tenant_message",
			recipientEmail: detail.tenant.primary_email,
			tenantId,
			applicationId: applicationId ?? detail.currentApplication?.id ?? null,
			subject: email.subject,
			html: email.html,
			text: email.text,
			payloadSnapshot: {
				subjectLine,
				message,
				sentByAdminUserId: auth.context.userId,
			},
		});

		return Response.json({ ok: true }, { status: 200 });
	} catch (error) {
		console.error("Failed to send tenant communication:", error);
		return Response.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to send tenant communication.",
			},
			{ status: 500 },
		);
	}
}
