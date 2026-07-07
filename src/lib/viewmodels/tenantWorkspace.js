import { normalizeTrailerType } from "@/lib/trailerTypes";

function dedupeById(items) {
	const seen = new Set();
	return items.filter((item) => {
		if (!item?.id || seen.has(item.id)) return false;
		seen.add(item.id);
		return true;
	});
}

function normalizeDocument(document) {
	return {
		id: document.id,
		source: document.source || "application",
		rentalId: document.rental_id ?? document.rentalId ?? null,
		applicationId: document.application_id ?? document.applicationId ?? null,
		fileName: document.file_name ?? document.fileName ?? "Document",
		documentType: document.document_type ?? document.documentType ?? "document",
		category: document.category,
		signedUrl: document.signed_url ?? document.signedUrl ?? null,
		createdAt: document.created_at ?? document.createdAt ?? null,
	};
}

function normalizeTimelineItem(item) {
	return {
		id: item.id,
		rentalId: item.rental_id ?? item.metadata?.rentalId ?? null,
		applicationId: item.application_id ?? null,
		type: item.type,
		itemKey: item.item_key ?? item.itemKey ?? null,
		stage: item.stage,
		title: item.title,
		description: item.description,
		dueAt: item.due_at ?? null,
		completedAt: item.completed_at ?? null,
		createdAt: item.created_at,
	};
}

function normalizeCommunication(communication) {
	return {
		id: communication.id,
		type: communication.type,
		status: communication.status,
		subject: communication.subject,
		recipientEmail: communication.recipient_email,
		createdAt: communication.created_at,
		sentAt: communication.sent_at ?? null,
		applicationId: communication.application_id ?? null,
		rentalId:
			communication.rental_id ??
			communication.payload_snapshot?.rentalId ??
			null,
		payloadSnapshot: communication.payload_snapshot ?? {},
	};
}

function normalizeTrailer(trailer) {
	if (!trailer) return null;
	return {
		id: trailer.id,
		trailerCode: trailer.trailer_code,
		trailerType: normalizeTrailerType(trailer.trailer_type) ?? trailer.trailer_type,
		plateNumber: trailer.plate_number,
		vin: trailer.vin,
		status: trailer.status,
	};
}

function normalizeRequestedTrailerTypes(rental) {
	const rows = Array.isArray(rental.requested_trailer_types)
		? rental.requested_trailer_types
		: Array.isArray(rental.requestedTrailerTypes)
			? rental.requestedTrailerTypes
			: [];
	const normalized = rows
		.map((row) => ({
			trailerType:
				normalizeTrailerType(row.trailer_type ?? row.trailerType) ??
				(row.trailer_type ?? row.trailerType),
			quantity: parseNumericValue(row.quantity) ?? 1,
		}))
		.filter((row) => row.trailerType && row.quantity > 0);

	if (normalized.length) return normalized;

	const fallbackType =
		normalizeTrailerType(rental.requested_trailer_type) ??
		rental.requested_trailer_type;
	if (!fallbackType) return [];

	return [
		{
			trailerType: fallbackType,
			quantity: parseNumericValue(rental.requested_trailer_count) ?? 1,
		},
	];
}

function parseNumericValue(value) {
	if (value === null || value === undefined || value === "") return null;
	const numericValue = Number(value);
	return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeBillingInvoiceLine(line) {
	return {
		id: line.id,
		invoiceId: line.invoice_id ?? line.invoiceId ?? null,
		rentalId: line.rental_id ?? line.rentalId ?? null,
		stripeLineItemId: line.stripe_line_item_id ?? line.stripeLineItemId ?? null,
		sourceType: line.source_type ?? line.sourceType ?? "rental_charge",
		description: line.description ?? "",
		amount: parseNumericValue(line.amount),
		quantity: parseNumericValue(line.quantity),
		currency: line.currency ?? "usd",
		periodStart: line.period_start ?? line.periodStart ?? null,
		periodEnd: line.period_end ?? line.periodEnd ?? null,
		metadata: line.metadata ?? {},
		createdAt: line.created_at ?? line.createdAt ?? null,
	};
}

function normalizeBillingInvoice(invoice) {
	return {
		id: invoice.id,
		tenantId: invoice.tenant_id ?? invoice.tenantId ?? null,
		rentalId: invoice.rental_id ?? invoice.rentalId ?? null,
		stripeInvoiceId: invoice.stripe_invoice_id ?? invoice.stripeInvoiceId ?? null,
		status: invoice.status ?? "unknown",
		billingReason: invoice.billing_reason ?? invoice.billingReason ?? null,
		currency: invoice.currency ?? "usd",
		amountDue: parseNumericValue(invoice.amount_due ?? invoice.amountDue),
		amountPaid: parseNumericValue(invoice.amount_paid ?? invoice.amountPaid),
		amountRemaining: parseNumericValue(
			invoice.amount_remaining ?? invoice.amountRemaining,
		),
		hostedInvoiceUrl:
			invoice.hosted_invoice_url ?? invoice.hostedInvoiceUrl ?? null,
		invoicePdfUrl: invoice.invoice_pdf_url ?? invoice.invoicePdfUrl ?? null,
		periodStart: invoice.period_start ?? invoice.periodStart ?? null,
		periodEnd: invoice.period_end ?? invoice.periodEnd ?? null,
		dueAt: invoice.due_at ?? invoice.dueAt ?? null,
		paidAt: invoice.paid_at ?? invoice.paidAt ?? null,
		createdAt: invoice.created_at ?? invoice.createdAt ?? null,
		lines: Array.isArray(invoice.lines)
			? invoice.lines.map(normalizeBillingInvoiceLine)
			: [],
	};
}

function normalizeSigningPacket(packet) {
	return {
		id: packet.id,
		rentalId: packet.rental_id ?? packet.rentalId ?? null,
		envelopeId: packet.docusign_envelope_id ?? packet.envelopeId ?? null,
		status: packet.status ?? "draft",
		signerName: packet.signer_name ?? packet.signerName ?? null,
		signerEmail: packet.signer_email ?? packet.signerEmail ?? null,
		documentCount: parseNumericValue(
			packet.document_count ?? packet.documentCount,
		) ?? 0,
		billingActivationStatus:
			packet.billing_activation_status ??
			packet.billingActivationStatus ??
			"pending",
		billingCheckoutUrl:
			packet.billing_checkout_url ?? packet.billingCheckoutUrl ?? null,
		billingCheckoutSessionId:
			packet.billing_checkout_session_id ??
			packet.billingCheckoutSessionId ??
			null,
		billingErrorMessage:
			packet.billing_error_message ?? packet.billingErrorMessage ?? null,
		completedAt: packet.completed_at ?? packet.completedAt ?? null,
		declinedAt: packet.declined_at ?? packet.declinedAt ?? null,
		voidedAt: packet.voided_at ?? packet.voidedAt ?? null,
		lastSyncedAt: packet.last_synced_at ?? packet.lastSyncedAt ?? null,
		errorMessage: packet.error_message ?? packet.errorMessage ?? null,
		documents: Array.isArray(packet.documents)
			? packet.documents.map((document) => ({
					id: document.id,
					documentName:
						document.document_name ?? document.documentName ?? "Document",
					docusignDocumentId:
						document.docusign_document_id ??
						document.docusignDocumentId ??
						null,
					status: document.status,
					rentalDocumentId:
						document.rental_document_id ?? document.rentalDocumentId ?? null,
					sortOrder: document.sort_order ?? document.sortOrder ?? 100,
			  }))
			: [],
	};
}

function normalizeRental(rental, tenantName) {
	const assignments = Array.isArray(rental.assignments)
		? rental.assignments.map((assignment) => ({
				id: assignment.id,
				trailerId: assignment.trailer_id,
				status: assignment.status,
				startDate: assignment.start_date,
				endDate: assignment.end_date,
				notes: assignment.notes,
				trailer: normalizeTrailer(assignment.trailer),
		  }))
		: [];
	const requestedTrailerTypes = normalizeRequestedTrailerTypes(rental);
	const primaryRequestedTrailerType = requestedTrailerTypes[0] ?? null;

	return {
		id: rental.id,
		tenantId: rental.tenant_id,
		tenantName: rental.tenant?.display_name ?? tenantName,
		applicationId: rental.application_id,
		status: rental.status,
		billingStatus: rental.billing_status,
		billingFrequency: rental.billing_frequency,
		rate: parseNumericValue(rental.rate),
		depositAmount: parseNumericValue(rental.deposit_amount),
		contractStartDate: rental.contract_start_date,
		operationalStartDate: rental.operational_start_date,
		endDate: rental.end_date,
		recordKind: rental.record_kind,
		requestKind: rental.request_kind,
		parentRentalId: rental.parent_rental_id,
		requestedTrailerTypes,
		requestedTrailerCount:
			primaryRequestedTrailerType?.quantity ?? rental.requested_trailer_count,
		requestedTrailerType:
			primaryRequestedTrailerType?.trailerType ??
			normalizeTrailerType(rental.requested_trailer_type) ??
			rental.requested_trailer_type,
		requestSummary: rental.request_summary,
		resolvedAt: rental.resolved_at,
		requestOutcome: rental.request_outcome,
		createdAt: rental.created_at,
		updatedAt: rental.updated_at,
		currentPeriodEnd: rental.current_period_end,
		lastInvoiceId: rental.last_invoice_id,
		billingInvoices: Array.isArray(rental.billing_invoices)
			? rental.billing_invoices.map(normalizeBillingInvoice)
			: Array.isArray(rental.billingInvoices)
				? rental.billingInvoices.map(normalizeBillingInvoice)
				: [],
		signingPackets: Array.isArray(rental.signing_packets)
			? rental.signing_packets.map(normalizeSigningPacket)
			: Array.isArray(rental.signingPackets)
				? rental.signingPackets.map(normalizeSigningPacket)
				: [],
		assignments,
	};
}

function groupTimelineItems(items) {
	return {
		actionRequired: items.filter(
			(item) => item.stage === "current" && item.type === "action_required",
		),
		inProgress: items.filter(
			(item) => item.stage === "current" && item.type !== "action_required",
		),
		upcoming: items.filter((item) => item.stage === "upcoming"),
		completed: items.filter((item) => item.stage === "completed"),
	};
}

function buildProposalReviewAction(rental) {
	return {
		id: `review-proposal-${rental.id}`,
		rentalId: rental.id,
		applicationId: rental.applicationId ?? null,
		type: "action_required",
		itemKey: "review_proposal",
		stage: "current",
		title: "Review proposal",
		description:
			"Review this rental proposal and approve it, decline it, or request changes.",
		dueAt: null,
		completedAt: null,
		createdAt: rental.updatedAt ?? rental.createdAt ?? null,
	};
}

export function buildTenantRentalViews(
	workspaceData,
) {
	const tenantName = workspaceData.tenant?.display_name ?? "Tenant";
	const allTimelineItems = Array.isArray(workspaceData.timelineItems)
		? workspaceData.timelineItems.map(normalizeTimelineItem)
		: [];
	const allCommunications = Array.isArray(workspaceData.communications)
		? workspaceData.communications
				.map(normalizeCommunication)
				.filter((communication) => !communication.payloadSnapshot?.invitationId)
		: [];
	const rentals = Array.isArray(workspaceData.rentals) ? workspaceData.rentals : [];

	return rentals.map((rawRental) => {
		const rental = normalizeRental(rawRental, tenantName);
		const application = rawRental.application
			? {
					id: rawRental.application.id,
					status: rawRental.application.status,
					companyName: rawRental.application.company_name,
					documents: Array.isArray(rawRental.application.documents)
						? rawRental.application.documents.map(normalizeDocument)
						: [],
					timelineItems: Array.isArray(rawRental.application.timeline_items)
						? rawRental.application.timeline_items.map(normalizeTimelineItem)
						: [],
			  }
			: null;
		const timelineItems = dedupeById([
			...(application?.timelineItems ?? []),
			...allTimelineItems.filter((item) => {
				if (item.rentalId) {
					return item.rentalId === rental.id;
				}
				return Boolean(
					rental.applicationId && item.applicationId === rental.applicationId,
				);
			}),
		]);
		if (
			rental.status === "customer_review" &&
			!timelineItems.some((item) => item.itemKey === "review_proposal")
		) {
			timelineItems.unshift(buildProposalReviewAction(rental));
		}
		const communications = allCommunications.filter((communication) => {
			if (communication.rentalId) {
				return communication.rentalId === rental.id;
			}
			return Boolean(
				rental.applicationId &&
					communication.applicationId === rental.applicationId,
			);
		});
		const trailers = dedupeById(
			rental.assignments.map((assignment) => assignment.trailer).filter(Boolean),
		);

		return {
			rental,
			application,
			documents: dedupeById([
				...(application?.documents ?? []),
				...(Array.isArray(rawRental.documents)
					? rawRental.documents.map(normalizeDocument)
					: []),
			]),
			communications,
			trailers,
			timelineItems,
			timeline: groupTimelineItems(timelineItems),
		};
	});
}
