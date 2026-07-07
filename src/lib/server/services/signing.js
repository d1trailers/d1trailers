import { createHash, createHmac, timingSafeEqual } from "crypto";
import { env, requireDocuSignConfig, requireDocuSignWebhookSecret } from "@/lib/server/env";
import { canManageRentals } from "@/lib/server/services/access";
import { activateRentalBilling, BillingOperationError } from "@/lib/server/services/billing";
import {
	createRentalDocument,
	createRentalSigningPacket,
	createRentalSigningPacketDocument,
	getDocuSignEventByHash,
	getActiveRentalSigningPacketByRentalId,
	getRentalById,
	getRentalSigningPacketByEnvelopeId,
	getRentalSigningPacketById,
	listActiveDocuSignTemplates,
	updateRental,
	updateRentalSigningPacket,
	updateRentalSigningPacketDocument,
	uploadRentalBuffer,
	upsertDocuSignEvent,
} from "@/lib/server/repos/platform";
import { formatTrailerType } from "@/lib/trailerTypes";

const DOCUSIGN_SCOPES = ["signature", "impersonation"];
const ACTIVE_PACKET_STATUSES = new Set(["draft", "sent", "in_progress"]);
const COMPLETED_PACKET_STATUSES = new Set(["completed"]);
const DEFAULT_TAB_LABELS = {
	tenantName: "tenantName",
	signerName: "signerName",
	signerEmail: "signerEmail",
	rentalId: "rentalId",
	rentalName: "rentalName",
	billingFrequency: "billingFrequency",
	rate: "rate",
	depositAmount: "depositAmount",
	contractStartDate: "contractStartDate",
	operationalStartDate: "operationalStartDate",
	endDate: "endDate",
	requestedTrailers: "requestedTrailers",
	assignedTrailers: "assignedTrailers",
};

let cachedAuth = null;
let docusignSdk = null;

export class SigningOperationError extends Error {
	constructor(status, message) {
		super(message);
		this.name = "SigningOperationError";
		this.status = status;
	}
}

function normalizePrivateKey(privateKey) {
	const normalized = String(privateKey || "").replace(/\\n/g, "\n").trim();
	if (normalized.includes("BEGIN")) return normalized;
	return Buffer.from(normalized, "base64").toString("utf8");
}

function getDocuSignSdk() {
	if (!docusignSdk) {
		const runtimeRequire = eval("require");
		docusignSdk = runtimeRequire("docusign-esign");
	}
	return docusignSdk;
}

function appUrl(path) {
	const base = env.APP_BASE_URL.replace(/\/+$/, "");
	return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function normalizeEnvelopeStatus(status) {
	const normalized = String(status || "").trim().toLowerCase();
	if (normalized.includes("completed")) return "completed";
	if (normalized.includes("declined")) return "declined";
	if (normalized.includes("voided")) return "voided";
	if (["completed", "complete"].includes(normalized)) return "completed";
	if (["declined", "decline"].includes(normalized)) return "declined";
	if (["voided", "void"].includes(normalized)) return "voided";
	if (["sent", "delivered"].includes(normalized)) return "sent";
	return "in_progress";
}

function safeNumber(value) {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
}

function formatDate(value) {
	return value || "";
}

function formatFrequency(value) {
	const normalized = String(value || "monthly");
	return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatCurrency(value) {
	const numeric = safeNumber(value);
	if (numeric === null) return "";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(numeric);
}

function getSignerName(context) {
	return context.profile?.display_name || context.email;
}

function getRentalName(rental) {
	const requested = summarizeRequestedTrailers(rental);
	return requested || `Rental ${String(rental.id).slice(0, 8)}`;
}

function summarizeRequestedTrailers(rental) {
	const rows = Array.isArray(rental.requested_trailer_types)
		? rental.requested_trailer_types
		: [];
	if (rows.length) {
		return rows
			.map((row) => `${formatTrailerType(row.trailer_type, row.trailer_type)} x ${row.quantity || 1}`)
			.join(", ");
	}

	if (rental.requested_trailer_type) {
		return `${formatTrailerType(rental.requested_trailer_type, rental.requested_trailer_type)} x ${rental.requested_trailer_count || 1}`;
	}

	return "";
}

function summarizeAssignedTrailers(rental) {
	return (rental.assignments || [])
		.filter((assignment) => assignment.status === "active")
		.map((assignment) => {
			const trailer = assignment.trailer || {};
			return [
				formatTrailerType(trailer.trailer_type, trailer.trailer_type || "Trailer"),
				trailer.trailer_code,
				trailer.plate_number,
			]
				.filter(Boolean)
				.join(" - ");
		})
		.join("; ");
}

function buildTabValues({ rental, context }) {
	return {
		tenantName: rental.tenant?.display_name || "",
		signerName: getSignerName(context),
		signerEmail: context.email,
		rentalId: rental.id,
		rentalName: getRentalName(rental),
		billingFrequency: formatFrequency(rental.billing_frequency),
		rate: formatCurrency(rental.rate),
		depositAmount: formatCurrency(rental.deposit_amount),
		contractStartDate: formatDate(rental.contract_start_date),
		operationalStartDate: formatDate(rental.operational_start_date),
		endDate: formatDate(rental.end_date),
		requestedTrailers: summarizeRequestedTrailers(rental),
		assignedTrailers: summarizeAssignedTrailers(rental),
	};
}

function getConfiguredTabLabels(template, key) {
	const configured = template.tab_config?.[key];
	if (Array.isArray(configured)) return configured.filter(Boolean).map(String);
	if (configured) return [String(configured)];
	return [DEFAULT_TAB_LABELS[key]].filter(Boolean);
}

function buildTextTabs(template, tabValues) {
	return Object.entries(tabValues).flatMap(([key, value]) =>
		getConfiguredTabLabels(template, key).map((tabLabel) => ({
			tabLabel,
			value: String(value ?? ""),
			locked: "true",
		}))
	);
}

function serializePacket(packet) {
	if (!packet) return null;
	return {
		id: packet.id,
		tenantId: packet.tenant_id,
		rentalId: packet.rental_id,
		envelopeId: packet.docusign_envelope_id,
		status: packet.status,
		signerName: packet.signer_name,
		signerEmail: packet.signer_email,
		documentCount: packet.document_count,
		billingActivationStatus: packet.billing_activation_status,
		billingCheckoutUrl: packet.billing_checkout_url,
		billingCheckoutSessionId: packet.billing_checkout_session_id,
		billingErrorMessage: packet.billing_error_message,
		completedAt: packet.completed_at,
		declinedAt: packet.declined_at,
		voidedAt: packet.voided_at,
		lastSyncedAt: packet.last_synced_at,
		errorMessage: packet.error_message,
		documents: Array.isArray(packet.documents)
			? packet.documents.map((document) => ({
					id: document.id,
					documentName: document.document_name,
					docusignDocumentId: document.docusign_document_id,
					status: document.status,
					rentalDocumentId: document.rental_document_id,
					sortOrder: document.sort_order,
			  }))
			: [],
	};
}

function assertCanManageRental(context, rental) {
	const membership = context.activeTenantMembership;
	if (!membership || membership.tenant_id !== rental.tenant_id || !canManageRentals(membership)) {
		throw new SigningOperationError(403, "You do not have permission to sign rental documents for this account.");
	}
}

function createApiClientWithToken(accessToken) {
	const config = requireDocuSignConfig();
	const docusign = getDocuSignSdk();
	const apiClient = new docusign.ApiClient();
	apiClient.setBasePath(config.basePath);
	apiClient.addDefaultHeader("Authorization", `Bearer ${accessToken}`);
	return { apiClient, config };
}

async function getDocuSignApiClient() {
	const config = requireDocuSignConfig();
	if (cachedAuth?.accessToken && cachedAuth.expiresAt > Date.now() + 60_000) {
		return createApiClientWithToken(cachedAuth.accessToken);
	}

	const docusign = getDocuSignSdk();
	const apiClient = new docusign.ApiClient();
	apiClient.setOAuthBasePath(config.authBasePath.replace(/^https?:\/\//, ""));
	const tokenResponse = await apiClient.requestJWTUserToken(
		config.integrationKey,
		config.userId,
		DOCUSIGN_SCOPES,
		Buffer.from(normalizePrivateKey(config.privateKey)),
		3600
	);
	const accessToken = tokenResponse.body?.access_token;
	const expiresIn = Number(tokenResponse.body?.expires_in || 3600);
	if (!accessToken) {
		throw new SigningOperationError(502, "DocuSign did not return an access token.");
	}

	cachedAuth = {
		accessToken,
		expiresAt: Date.now() + expiresIn * 1000,
	};

	return createApiClientWithToken(accessToken);
}

async function getEnvelopesApi() {
	const docusign = getDocuSignSdk();
	const { apiClient, config } = await getDocuSignApiClient();
	return {
		envelopesApi: new docusign.EnvelopesApi(apiClient),
		accountId: config.accountId,
	};
}

function buildEnvelopeDefinition({ rental, packet, templates, context }) {
	const tabValues = buildTabValues({ rental, context });
	return {
		emailSubject: `D1 Trailers rental documents - ${getRentalName(rental)}`,
		status: "sent",
		customFields: {
			textCustomFields: [
				{ name: "packetId", value: packet.id, show: "false" },
				{ name: "rentalId", value: rental.id, show: "false" },
				{ name: "tenantId", value: rental.tenant_id, show: "false" },
			],
		},
		compositeTemplates: templates.map((template, index) => ({
			compositeTemplateId: String(index + 1),
			serverTemplates: [
				{
					sequence: "1",
					templateId: template.docusign_template_id,
				},
			],
			inlineTemplates: [
				{
					sequence: "2",
					recipients: {
						signers: [
							{
								email: packet.signer_email,
								name: packet.signer_name || packet.signer_email,
								roleName: template.role_name || "tenant_signer",
								recipientId: "1",
								clientUserId: packet.signer_profile_id || packet.id,
								tabs: {
									textTabs: buildTextTabs(template, tabValues),
								},
							},
						],
					},
				},
			],
		})),
	};
}

async function createEnvelope({ rental, packet, templates, context }) {
	const { envelopesApi, accountId } = await getEnvelopesApi();
	const envelopeDefinition = buildEnvelopeDefinition({ rental, packet, templates, context });
	const result = await envelopesApi.createEnvelope(accountId, { envelopeDefinition });
	if (!result?.envelopeId) {
		throw new SigningOperationError(502, "DocuSign did not return an envelope ID.");
	}
	return result.envelopeId;
}

async function createRecipientView(packet) {
	if (!packet.docusign_envelope_id) {
		throw new SigningOperationError(409, "Signing packet does not have a DocuSign envelope yet.");
	}
	const { envelopesApi, accountId } = await getEnvelopesApi();
	const recipientViewRequest = {
		returnUrl: appUrl(`/signing/docusign-return?packet=${packet.id}`),
		authenticationMethod: "none",
		email: packet.signer_email,
		userName: packet.signer_name || packet.signer_email,
		clientUserId: packet.signer_profile_id || packet.id,
	};
	const view = await envelopesApi.createRecipientView(
		accountId,
		packet.docusign_envelope_id,
		{ recipientViewRequest }
	);
	return view?.url || null;
}

async function refreshEnvelopeStatus(packet) {
	if (!packet.docusign_envelope_id) return packet;
	const { envelopesApi, accountId } = await getEnvelopesApi();
	const envelope = await envelopesApi.getEnvelope(accountId, packet.docusign_envelope_id, {});
	const status = normalizeEnvelopeStatus(envelope?.status);
	if (status === packet.status && packet.last_synced_at) return packet;
	return updateRentalSigningPacket({
		packetId: packet.id,
		status,
		completedAt: status === "completed" ? envelope?.completedDateTime || new Date().toISOString() : packet.completed_at,
		declinedAt: status === "declined" ? new Date().toISOString() : packet.declined_at,
		voidedAt: status === "voided" ? new Date().toISOString() : packet.voided_at,
		lastSyncedAt: new Date().toISOString(),
	});
}

async function approveRentalForBilling(rentalId) {
	const rental = await getRentalById(rentalId);
	if (!rental) throw new SigningOperationError(404, "Rental not found.");
	if (rental.record_kind === "agreement" && rental.status === "awaiting_first_payment") {
		return rental;
	}
	if (rental.status !== "customer_review") {
		return rental;
	}
	return updateRental({
		rentalId: rental.id,
		recordKind: "agreement",
		requestOutcome: "approved_as_agreement",
		resolvedAt: new Date().toISOString(),
		status: "awaiting_first_payment",
		billingStatus: "awaiting_first_payment",
	});
}

async function listEnvelopeDocuments(envelopeId) {
	const { envelopesApi, accountId } = await getEnvelopesApi();
	const result = await envelopesApi.listDocuments(accountId, envelopeId, {});
	return Array.isArray(result?.envelopeDocuments) ? result.envelopeDocuments : [];
}

async function downloadEnvelopeDocument(envelopeId, documentId) {
	const { envelopesApi, accountId } = await getEnvelopesApi();
	const result = await envelopesApi.getDocument(accountId, envelopeId, documentId, {});
	if (Buffer.isBuffer(result)) return result;
	if (result instanceof ArrayBuffer) return Buffer.from(result);
	if (typeof result === "string") return Buffer.from(result, "binary");
	if (result?.data) return Buffer.from(result.data);
	return Buffer.from(result);
}

async function storeSignedDocuments(packet) {
	if (!packet.docusign_envelope_id) return packet;
	const envelopeDocuments = await listEnvelopeDocuments(packet.docusign_envelope_id);
	const signableDocuments = envelopeDocuments.filter((document) => {
		const id = String(document.documentId || "");
		return id && id !== "certificate";
	});
	const existingDocuments = Array.isArray(packet.documents) ? packet.documents : [];

	for (const [index, envelopeDocument] of signableDocuments.entries()) {
		const documentId = String(envelopeDocument.documentId);
		const documentName = envelopeDocument.name || `Signed Document ${index + 1}.pdf`;
		let packetDocument = existingDocuments.find(
			(document) => document.docusign_document_id === documentId
		);
		if (!packetDocument) {
			packetDocument = await createRentalSigningPacketDocument({
				packetId: packet.id,
				rentalId: packet.rental_id,
				docusignDocumentId: documentId,
				documentName,
				status: "signed",
				sortOrder: index + 1,
			});
		}
		if (packetDocument.rental_document_id && packetDocument.status === "stored") {
			continue;
		}

		const pdfBuffer = await downloadEnvelopeDocument(packet.docusign_envelope_id, documentId);
		const fileName = documentName.toLowerCase().endsWith(".pdf")
			? documentName
			: `${documentName}.pdf`;
		const storagePath = await uploadRentalBuffer({
			rentalId: packet.rental_id,
			fileName,
			contentType: "application/pdf",
			buffer: pdfBuffer,
		});
		const rentalDocument = await createRentalDocument({
			rentalId: packet.rental_id,
			bucket: "application-documents",
			storagePath,
			fileName,
			contentType: "application/pdf",
			category: "signed_packet",
			documentType: "docusign_signed_document",
			createdByProfileId: packet.signer_profile_id,
		});
		await updateRentalSigningPacketDocument({
			documentId: packetDocument.id,
			docusignDocumentId: documentId,
			documentName: fileName,
			status: "stored",
			bucket: "application-documents",
			storagePath,
			rentalDocumentId: rentalDocument.id,
		});
	}

	const existingCombined = existingDocuments.find(
		(document) => document.docusign_document_id === "combined"
	);
	if (!existingCombined?.rental_document_id) {
		try {
			const combinedBuffer = await downloadEnvelopeDocument(
				packet.docusign_envelope_id,
				"combined"
			);
			if (combinedBuffer.length) {
				const fileName = "Signed Rental Packet.pdf";
				const storagePath = await uploadRentalBuffer({
					rentalId: packet.rental_id,
					fileName,
					contentType: "application/pdf",
					buffer: combinedBuffer,
				});
				const rentalDocument = await createRentalDocument({
					rentalId: packet.rental_id,
					bucket: "application-documents",
					storagePath,
					fileName,
					contentType: "application/pdf",
					category: "signed_packet",
					documentType: "docusign_combined_packet",
					createdByProfileId: packet.signer_profile_id,
				});
				if (existingCombined) {
					await updateRentalSigningPacketDocument({
						documentId: existingCombined.id,
						status: "stored",
						bucket: "application-documents",
						storagePath,
						rentalDocumentId: rentalDocument.id,
					});
				} else {
					await createRentalSigningPacketDocument({
						packetId: packet.id,
						rentalId: packet.rental_id,
						docusignDocumentId: "combined",
						documentName: fileName,
						status: "stored",
						bucket: "application-documents",
						storagePath,
						rentalDocumentId: rentalDocument.id,
						sortOrder: 999,
					});
				}
			}
		} catch {
			// Some DocuSign accounts do not expose a combined document through this call.
		}
	}

	return getRentalSigningPacketById(packet.id);
}

async function activateBillingAfterSigning(packet) {
	if (packet.billing_activation_status === "completed" && packet.billing_checkout_url) {
		return packet;
	}

	try {
		await approveRentalForBilling(packet.rental_id);
		const billing = await activateRentalBilling(packet.rental_id);
		return updateRentalSigningPacket({
			packetId: packet.id,
			billingActivationStatus: "completed",
			billingCheckoutUrl: billing.url || null,
			billingCheckoutSessionId: billing.sessionId || null,
			billingErrorMessage: null,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Billing activation failed.";
		const status = error instanceof BillingOperationError ? "failed" : "failed";
		await updateRentalSigningPacket({
			packetId: packet.id,
			billingActivationStatus: status,
			billingErrorMessage: message,
		});
		throw error;
	}
}

export async function startRentalSigning(context, rentalId) {
	const rental = await getRentalById(rentalId);
	if (!rental) throw new SigningOperationError(404, "Rental not found.");
	assertCanManageRental(context, rental);
	if (rental.status !== "customer_review") {
		throw new SigningOperationError(409, "Only customer-review proposals can be approved and signed.");
	}

	const activePacket = await getActiveRentalSigningPacketByRentalId(rental.id);
	if (activePacket?.docusign_envelope_id) {
		const syncedPacket = await refreshEnvelopeStatus(activePacket);
		if (syncedPacket.status === "completed") {
			const completedPacket = await finalizeCompletedPacket(syncedPacket, {
				throwBillingErrors: false,
			});
			return { packet: serializePacket(completedPacket), recipientViewUrl: null };
		}
		const recipientViewUrl = ACTIVE_PACKET_STATUSES.has(syncedPacket.status)
			? await createRecipientView(syncedPacket)
			: null;
		return { packet: serializePacket(syncedPacket), recipientViewUrl };
	}

	const templates = await listActiveDocuSignTemplates();
	if (!templates.length) {
		throw new SigningOperationError(409, "No active DocuSign templates are configured.");
	}

	let packet = await createRentalSigningPacket({
		tenantId: rental.tenant_id,
		rentalId: rental.id,
		status: "draft",
		signerProfileId: context.userId,
		signerName: getSignerName(context),
		signerEmail: context.email,
		documentCount: templates.length,
		metadata: {
			templateKeys: templates.map((template) => template.template_key),
		},
	});

	try {
		const envelopeId = await createEnvelope({ rental, packet, templates, context });
		packet = await updateRentalSigningPacket({
			packetId: packet.id,
			envelopeId,
			status: "sent",
			documentCount: templates.length,
			lastSyncedAt: new Date().toISOString(),
		});

		await Promise.all(
			templates.map((template, index) =>
				createRentalSigningPacketDocument({
					packetId: packet.id,
					rentalId: rental.id,
					templateId: template.id,
					documentName: template.display_name,
					status: "pending",
					sortOrder: index + 1,
					metadata: { templateKey: template.template_key },
				})
			)
		);

		packet = (await getRentalSigningPacketById(packet.id)) || packet;
		const recipientViewUrl = await createRecipientView(packet);
		return { packet: serializePacket(packet), recipientViewUrl };
	} catch (error) {
		await updateRentalSigningPacket({
			packetId: packet.id,
			status: "failed",
			errorMessage: error instanceof Error ? error.message : "Failed to start DocuSign signing.",
		});
		throw error;
	}
}

export async function getSigningPacketForAccount(context, packetId) {
	const packet = await getRentalSigningPacketById(packetId);
	if (!packet) throw new SigningOperationError(404, "Signing packet not found.");
	const rental = await getRentalById(packet.rental_id);
	if (!rental) throw new SigningOperationError(404, "Rental not found.");
	assertCanManageRental(context, rental);

	let syncedPacket = packet;
	if (packet.docusign_envelope_id && !COMPLETED_PACKET_STATUSES.has(packet.status)) {
		syncedPacket = await refreshEnvelopeStatus(packet);
	}
	if (syncedPacket.status === "completed") {
		syncedPacket = await finalizeCompletedPacket(syncedPacket, { throwBillingErrors: false });
	}
	return serializePacket(syncedPacket);
}

export async function createSigningRecipientViewForAccount(context, packetId) {
	const packet = await getRentalSigningPacketById(packetId);
	if (!packet) throw new SigningOperationError(404, "Signing packet not found.");
	const rental = await getRentalById(packet.rental_id);
	if (!rental) throw new SigningOperationError(404, "Rental not found.");
	assertCanManageRental(context, rental);
	if (!ACTIVE_PACKET_STATUSES.has(packet.status)) {
		throw new SigningOperationError(409, "This signing packet is no longer active.");
	}
	return { recipientViewUrl: await createRecipientView(packet) };
}

export async function voidSigningPacketForStaff(context, packetId) {
	if (!context?.staffMembership?.is_active) {
		throw new SigningOperationError(403, "Only staff can void signing packets.");
	}

	const packet = await getRentalSigningPacketById(packetId);
	if (!packet) throw new SigningOperationError(404, "Signing packet not found.");
	if (packet.status === "completed") {
		throw new SigningOperationError(409, "Completed signing packets cannot be voided.");
	}

	if (packet.docusign_envelope_id && ACTIVE_PACKET_STATUSES.has(packet.status)) {
		const { envelopesApi, accountId } = await getEnvelopesApi();
		await envelopesApi.update(accountId, packet.docusign_envelope_id, {
			envelope: {
				status: "voided",
				voidedReason: "Voided by D1Trailers staff to allow packet recreation.",
			},
		});
	}

	const updatedPacket = await updateRentalSigningPacket({
		packetId: packet.id,
		status: "voided",
		voidedAt: new Date().toISOString(),
		errorMessage: null,
	});

	return serializePacket(updatedPacket);
}

async function finalizeCompletedPacket(packet, options = {}) {
	let currentPacket = packet;
	if (currentPacket.status !== "completed") {
		currentPacket = await updateRentalSigningPacket({
			packetId: currentPacket.id,
			status: "completed",
			completedAt: currentPacket.completed_at || new Date().toISOString(),
			lastSyncedAt: new Date().toISOString(),
		});
	}
	currentPacket = (await storeSignedDocuments(currentPacket)) || currentPacket;
	try {
		currentPacket = await activateBillingAfterSigning(currentPacket);
	} catch (error) {
		if (options.throwBillingErrors) throw error;
	}
	return (await getRentalSigningPacketById(currentPacket.id)) || currentPacket;
}

function extractEnvelopeId(payload) {
	return (
		payload?.data?.envelopeId ||
		payload?.data?.envelopeSummary?.envelopeId ||
		payload?.envelopeId ||
		payload?.envelopeSummary?.envelopeId ||
		null
	);
}

function extractEnvelopeStatus(payload) {
	return (
		payload?.data?.envelopeSummary?.status ||
		payload?.data?.status ||
		payload?.envelopeSummary?.status ||
		payload?.status ||
		payload?.event ||
		payload?.eventType ||
		""
	);
}

function getEventType(payload) {
	return String(payload?.event || payload?.eventType || payload?.type || "docusign_event");
}

function verifyWebhookSignature(rawBody, signatureHeader) {
	const secret = requireDocuSignWebhookSecret();
	const signature = String(signatureHeader || "").trim();
	if (!signature) return false;
	const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
	const left = Buffer.from(expected);
	const right = Buffer.from(signature);
	return left.length === right.length && timingSafeEqual(left, right);
}

export async function processDocuSignWebhook({ rawBody, signature }) {
	if (!verifyWebhookSignature(rawBody, signature)) {
		throw new SigningOperationError(400, "Invalid DocuSign webhook signature.");
	}

	const payload = JSON.parse(rawBody || "{}");
	const eventType = getEventType(payload);
	const envelopeId = extractEnvelopeId(payload);
	const eventHash = createHash("sha256")
		.update(`${eventType}:${envelopeId || "none"}:${rawBody}`)
		.digest("hex");
	const previousEvent = await getDocuSignEventByHash(eventHash);
	if (previousEvent?.processing_status === "processed") {
		return { status: "skipped", reason: "duplicate" };
	}
	const existingEvent = await upsertDocuSignEvent({
		eventHash,
		eventType,
		envelopeId,
		rawPayload: payload,
	});
	if (existingEvent.processing_status === "processed") {
		return { status: "skipped", reason: "duplicate" };
	}

	const packet = envelopeId ? await getRentalSigningPacketByEnvelopeId(envelopeId) : null;
	if (!packet) {
		await upsertDocuSignEvent({
			eventHash,
			eventType,
			envelopeId,
			processingStatus: "skipped",
			errorMessage: "No matching signing packet.",
			rawPayload: payload,
			processedAt: new Date().toISOString(),
		});
		return { status: "skipped", reason: "packet_not_found" };
	}

	try {
		const status = normalizeEnvelopeStatus(extractEnvelopeStatus(payload));
		let updatedPacket = await updateRentalSigningPacket({
			packetId: packet.id,
			status,
			completedAt: status === "completed" ? packet.completed_at || new Date().toISOString() : packet.completed_at,
			declinedAt: status === "declined" ? packet.declined_at || new Date().toISOString() : packet.declined_at,
			voidedAt: status === "voided" ? packet.voided_at || new Date().toISOString() : packet.voided_at,
			lastSyncedAt: new Date().toISOString(),
		});

		if (status === "completed") {
			updatedPacket = await finalizeCompletedPacket(updatedPacket, { throwBillingErrors: false });
		}

		await upsertDocuSignEvent({
			eventHash,
			eventType,
			envelopeId,
			packetId: packet.id,
			processingStatus: "processed",
			rawPayload: payload,
			processedAt: new Date().toISOString(),
		});
		return { status: "processed", packet: serializePacket(updatedPacket) };
	} catch (error) {
		await upsertDocuSignEvent({
			eventHash,
			eventType,
			envelopeId,
			packetId: packet.id,
			processingStatus: "failed",
			errorMessage: error instanceof Error ? error.message : "DocuSign webhook failed.",
			rawPayload: payload,
		});
		throw error;
	}
}
