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
		trailerType: trailer.trailer_type,
		plateNumber: trailer.plate_number,
		vin: trailer.vin,
		status: trailer.status,
	};
}

function parseNumericValue(value) {
	if (value === null || value === undefined || value === "") return null;
	const numericValue = Number(value);
	return Number.isFinite(numericValue) ? numericValue : null;
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
		requestedTrailerCount: rental.requested_trailer_count,
		requestedTrailerType: rental.requested_trailer_type,
		requestSummary: rental.request_summary,
		resolvedAt: rental.resolved_at,
		requestOutcome: rental.request_outcome,
		createdAt: rental.created_at,
		updatedAt: rental.updated_at,
		currentPeriodEnd: rental.current_period_end,
		lastInvoiceId: rental.last_invoice_id,
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
