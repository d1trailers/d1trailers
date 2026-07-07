"use client";

import { useEffect, useMemo, useState } from "react";
import {
	ArrowPathIcon,
	CheckCircleIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import Card from "@/components/ui/Card";
import ScreenModal from "@/components/ui/ScreenModal";
import ActionButton from "@/components/ui/ActionButton";
import StatusBadge from "@/components/admin/StatusBadge";
import SearchInput from "@/components/portal/SearchInput";
import RentalEditableFields from "@/components/rentals/RentalEditableFields";
import {
	getRentalRecordTitle,
	RentalDocumentsCard,
	RentalHeaderCard,
} from "@/components/rentals/RentalDetailShared";
import RentalTrailerChecklist from "@/components/rentals/RentalTrailerChecklist";
import RentalDocumentUploadCard from "@/components/rentals/RentalDocumentUploadCard";
import ConfirmActionModal from "@/components/ui/ConfirmActionModal";
import {
	RentalBillingCard,
	RentalTimelineGrid,
} from "@/components/rentals/RentalActivitySections";
import {
	getTrailerTypeFormValue,
} from "@/lib/trailerTypes";
import { serializeRequestedTrailerTypes } from "@/components/rentals/RequestedTrailerTypesField";

const EMPTY_ARRAY = [];

function dedupeById(items) {
	const seen = new Set();
	return items.filter((item) => {
		if (!item?.id || seen.has(item.id)) return false;
		seen.add(item.id);
		return true;
	});
}

function emptyForm(tenantId = "") {
	return {
		tenantId,
		status: "draft",
		billingStatus: "draft",
		billingFrequency: "monthly",
		rate: "",
		depositAmount: "",
		contractStartDate: "",
		operationalStartDate: "",
		endDate: "",
		requestSummary: "",
		requestedTrailerTypes: [{ trailerType: "flatbed", quantity: "1" }],
		trailerIds: [],
	};
}

function getRequestedTrailerTypesForForm(rental) {
	const rows = Array.isArray(rental?.requestedTrailerTypes)
		? rental.requestedTrailerTypes
		: [];
	const normalized = rows
		.map((row) => ({
			trailerType: getTrailerTypeFormValue(row?.trailerType) || "flatbed",
			quantity:
				row?.quantity === null || row?.quantity === undefined
					? "1"
					: String(row.quantity),
		}))
		.filter((row) => row.trailerType);

	if (normalized.length) return normalized;

	return [
		{
			trailerType: getTrailerTypeFormValue(rental?.requestedTrailerType) || "flatbed",
			quantity:
				rental?.requestedTrailerCount === null ||
				rental?.requestedTrailerCount === undefined
					? "1"
					: String(rental.requestedTrailerCount),
		},
	];
}

function buildCommunicationDraft(rental, application) {
	const companyName =
		application?.companyName || rental?.tenantName || "this account";

	return {
		subjectLine: `Rental update for ${companyName}`,
		message: "",
		stage: "current",
		sendEmail: true,
	};
}

function getLatestSigningPacket(rental) {
	const packets = Array.isArray(rental?.signingPackets) ? rental.signingPackets : [];
	return packets[0] ?? null;
}

function SigningPacketSummary({ packet }) {
	const [voiding, setVoiding] = useState(false);
	const [voidError, setVoidError] = useState("");

	if (!packet) {
		return (
			<Card>
				<div className="space-y-2">
					<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
						Signing Packet
					</h3>
					<p className="text-sm text-neutral-600 dark:text-neutral-400">
						No DocuSign packet has been created for this rental yet.
					</p>
				</div>
			</Card>
		);
	}

	async function handleVoidPacket() {
		setVoiding(true);
		setVoidError("");
		try {
			const response = await fetch(`/api/admin/signing-packets/${packet.id}/void`, {
				method: "POST",
			});
			const json = await response.json().catch(() => ({}));
			if (!response.ok) {
				setVoidError(
					typeof json?.error === "string"
						? json.error
						: "Unable to void signing packet."
				);
				setVoiding(false);
				return;
			}
			window.location.reload();
		} catch {
			setVoidError("Unable to void signing packet.");
			setVoiding(false);
		}
	}

	const canVoid = ["draft", "sent", "in_progress", "failed"].includes(packet.status);

	return (
		<Card>
			<div className="space-y-4">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
							Signing Packet
						</h3>
						<p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
							{packet.signerName || packet.signerEmail} | {packet.signerEmail}
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<StatusBadge status={packet.status} />
						<StatusBadge status={packet.billingActivationStatus} />
					</div>
				</div>
				<div className="grid gap-3 md:grid-cols-3">
					<div className="rounded-2xl border border-(--border-soft) p-3">
						<p className="text-xs uppercase tracking-[0.12em] text-neutral-500">
							Envelope
						</p>
						<p className="mt-1 break-all text-sm font-semibold text-neutral-950 dark:text-neutral-50">
							{packet.envelopeId || "Pending"}
						</p>
					</div>
					<div className="rounded-2xl border border-(--border-soft) p-3">
						<p className="text-xs uppercase tracking-[0.12em] text-neutral-500">
							Completed
						</p>
						<p className="mt-1 text-sm font-semibold text-neutral-950 dark:text-neutral-50">
							{packet.completedAt
								? new Date(packet.completedAt).toLocaleString()
								: "Not complete"}
						</p>
					</div>
					<div className="rounded-2xl border border-(--border-soft) p-3">
						<p className="text-xs uppercase tracking-[0.12em] text-neutral-500">
							Documents
						</p>
						<p className="mt-1 text-sm font-semibold text-neutral-950 dark:text-neutral-50">
							{packet.documents?.length || 0} / {packet.documentCount || 0}
						</p>
					</div>
				</div>
				{packet.documents?.length ? (
					<div className="space-y-2">
						{packet.documents.map((document) => (
							<div
								key={document.id}
								className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-(--border-soft) px-3 py-2"
							>
								<p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">
									{document.documentName}
								</p>
								<StatusBadge status={document.status} />
							</div>
						))}
					</div>
				) : null}
				{packet.billingErrorMessage ? (
					<p className="text-sm font-medium text-red-600">
						{packet.billingErrorMessage}
					</p>
				) : null}
				{voidError ? (
					<p className="text-sm font-medium text-red-600">{voidError}</p>
				) : null}
				{canVoid ? (
					<div className="flex justify-end">
						<ActionButton
							type="button"
							tone="danger"
							onClick={handleVoidPacket}
							disabled={voiding}
						>
							{voiding ? "Voiding..." : "Void / Allow Recreate"}
						</ActionButton>
					</div>
				) : null}
			</div>
		</Card>
	);
}

export default function RentalManagementModal({
	open,
	onClose,
	mode = "edit",
	detail,
	loading,
	error,
	onSubmit,
	onDelete,
	submitting,
	deleting,
	submitError,
	onSendCommunication,
	onRemoveAssignment,
	onUploadDocument,
	tenantOptions = [],
	initialTenantId = "",
	availableTrailerOptions = [],
	maxWidthClass = "max-w-6xl",
}) {
	const rental = detail?.rental ?? null;
	const signingPacket = getLatestSigningPacket(rental);
	const rentalView = detail?.rentalView ?? null;
	const availableTrailers = Array.isArray(detail?.availableTrailers)
		? detail.availableTrailers
		: Array.isArray(availableTrailerOptions)
			? availableTrailerOptions
			: EMPTY_ARRAY;
	const [form, setForm] = useState(emptyForm(initialTenantId));
	const [tenantSearch, setTenantSearch] = useState("");
	const [trailerSearch, setTrailerSearch] = useState("");
	const [communicationDraft, setCommunicationDraft] = useState(() =>
		buildCommunicationDraft(null, null)
	);
	const [communicationLoading, setCommunicationLoading] = useState(false);
	const [communicationError, setCommunicationError] = useState("");
	const [communicationSuccess, setCommunicationSuccess] = useState("");
	const [destructiveLoading, setDestructiveLoading] = useState(false);
	const [pendingDestructiveAction, setPendingDestructiveAction] = useState(null);

	useEffect(() => {
		if (!open) return;

		if (mode === "create") {
			const frame = window.requestAnimationFrame(() => {
				setForm(emptyForm(initialTenantId));
				setCommunicationDraft(buildCommunicationDraft(null, null));
				setCommunicationError("");
				setCommunicationSuccess("");
			});
			return () => window.cancelAnimationFrame(frame);
		}

		if (!rental) {
			return;
		}

		const frame = window.requestAnimationFrame(() => {
			setForm({
				tenantId: rental.tenantId || initialTenantId || "",
				status: rental.status || "draft",
				billingStatus: rental.billingStatus || "draft",
				billingFrequency: rental.billingFrequency || "monthly",
				rate: rental.rate ?? "",
				depositAmount: rental.depositAmount ?? "",
				contractStartDate: rental.contractStartDate || "",
				operationalStartDate: rental.operationalStartDate || "",
				endDate: rental.endDate || "",
				requestSummary: rental.requestSummary || "",
				requestedTrailerTypes: getRequestedTrailerTypesForForm(rental),
				trailerIds: (rental.assignments ?? [])
					.filter((assignment) => assignment.status === "active")
					.map((assignment) => assignment.trailerId),
			});
			setCommunicationDraft(
				buildCommunicationDraft(rental, rentalView?.application ?? rental.application ?? null)
			);
			setCommunicationError("");
			setCommunicationSuccess("");
		});
		return () => window.cancelAnimationFrame(frame);
	}, [initialTenantId, mode, open, rental, rentalView?.application]);

	const canSendProposal =
		Boolean(rental) &&
		["draft", "customer_review", "changes_pending"].includes(rental?.status) &&
		(rental?.recordKind !== "request" || !rental?.resolvedAt) &&
		!["declined", "cancelled", "returned"].includes(rental?.status);
	const proposalAction =
		rental?.status === "changes_pending" ? "resend_proposal" : "send_proposal";
	const proposalLabel =
		rental?.status === "changes_pending" ? "Resend Proposal" : "Send Proposal";
	const canDelete = Boolean(rental?.canDelete);
	const showTrailerApproval = rental?.requestKind === "rental_expansion" && canSendProposal;
	const canAssignTrailersToExistingRental =
		Boolean(rental) && !["returned", "cancelled"].includes(rental.status);
	const showTrailerSelection =
		showTrailerApproval ||
		mode === "create" ||
		canAssignTrailersToExistingRental;
	const tenantSelectionLocked =
		mode !== "create" && Boolean(rental?.applicationId || rental?.parentRentalId);
	const title =
		mode === "create"
			? "Add Rental"
			: getRentalRecordTitle(rental);
	const approvedTermsLocked =
		mode !== "create" &&
		(rental?.recordKind === "agreement" ||
			["awaiting_first_payment", "active", "past_due", "suspended"].includes(
				rental?.status
			));
	const selectedTrailerSet = useMemo(
		() => new Set(form.trailerIds),
		[form.trailerIds]
	);
	const activeAssignments = useMemo(
		() =>
			(rental?.assignments ?? []).filter(
				(assignment) => assignment.status === "active" && assignment.trailer
			),
		[rental?.assignments]
	);
	const activeAssignmentTrailerIds = useMemo(
		() => new Set(activeAssignments.map((assignment) => assignment.trailerId)),
		[activeAssignments]
	);
	const applicationDocuments = dedupeById([
		...(Array.isArray(rental?.application?.documents)
			? rental.application.documents
			: EMPTY_ARRAY),
		...(Array.isArray(rental?.documents) ? rental.documents : EMPTY_ARRAY),
		...(Array.isArray(rentalView?.documents) ? rentalView.documents : EMPTY_ARRAY),
	]);
	const timeline = rentalView?.timeline ?? {
		actionRequired: [],
		inProgress: [],
		upcoming: [],
		completed: [],
	};
	const filteredTrailerOptions = useMemo(() => {
		const query = trailerSearch.trim().toLowerCase();
		const assignedTrailerOptions = activeAssignments.map((assignment) => ({
			...(assignment.trailer ?? {}),
			id: assignment.trailerId,
			assignmentId: assignment.id,
			assignmentStatus: selectedTrailerSet.has(assignment.trailerId)
				? "Assigned to this rental"
				: "Will be unassigned on save",
		}));
		const availableTrailerOptions = availableTrailers
			.filter((trailer) => !activeAssignmentTrailerIds.has(trailer.id))
			.map((trailer) => ({
				...trailer,
				assignmentStatus: selectedTrailerSet.has(trailer.id)
					? "Will be assigned on save"
					: "Available",
			}));
		const trailerOptions = [...assignedTrailerOptions, ...availableTrailerOptions];
		if (!query) return trailerOptions;
		return trailerOptions.filter((trailer) =>
			[
				trailer.trailerCode,
				trailer.trailerType,
				trailer.plateNumber,
				trailer.vin,
			]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(query))
		);
	}, [
		activeAssignmentTrailerIds,
		activeAssignments,
		availableTrailers,
		selectedTrailerSet,
		trailerSearch,
	]);
	const filteredTenantOptions = useMemo(() => {
		const query = tenantSearch.trim().toLowerCase();
		if (!query) return tenantOptions;
		return tenantOptions.filter((tenant) =>
			[tenant.displayName, tenant.primaryEmail, tenant.primaryPhone]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(query))
		);
	}, [tenantOptions, tenantSearch]);
	const selectedTenant = useMemo(() => {
		if (!form.tenantId) return null;
		return (
			tenantOptions.find((tenant) => tenant.id === form.tenantId) ?? {
				id: form.tenantId,
				displayName: rental?.tenantName || "Unknown tenant",
				primaryEmail: "",
				primaryPhone: "",
			}
		);
	}, [form.tenantId, rental?.tenantName, tenantOptions]);

	function updateField(field, value) {
		setForm((current) => ({
			...current,
			[field]: value,
		}));
	}

	function toggleTrailer(trailerId) {
		setForm((current) => ({
			...current,
			trailerIds: selectedTrailerSet.has(trailerId)
				? current.trailerIds.filter((value) => value !== trailerId)
				: [...current.trailerIds, trailerId],
		}));
	}

	function buildPayload(action = "save") {
		const payload = {
			action,
			tenantId: form.tenantId,
			status: form.status,
			billingStatus: form.billingStatus,
			rate: form.rate,
			depositAmount: form.depositAmount,
			operationalStartDate: form.operationalStartDate,
			endDate: form.endDate,
			trailerIds: form.trailerIds,
		};

		if (!approvedTermsLocked) {
			payload.billingFrequency = form.billingFrequency;
			payload.contractStartDate = form.contractStartDate;
		}

		if (mode === "create") {
			payload.requestSummary = form.requestSummary;
			payload.requestedTrailerTypes = serializeRequestedTrailerTypes(
				form.requestedTrailerTypes
			);
		}

		return payload;
	}

	function getAssignmentsToRemove() {
		return activeAssignments.filter(
			(assignment) => !selectedTrailerSet.has(assignment.trailerId)
		);
	}

	async function submitRentalAction(action = "save", confirmed = false) {
		const assignmentsToRemove = getAssignmentsToRemove();
		if (["deny_request", "cancel_request"].includes(action) && !confirmed) {
			setPendingDestructiveAction({
				type: "resolve_request",
				action,
				assignments: assignmentsToRemove,
			});
			return;
		}

		if (assignmentsToRemove.length && !confirmed) {
			setPendingDestructiveAction({
				type: "save_with_unassignments",
				action,
				assignments: assignmentsToRemove,
			});
			return;
		}

		setDestructiveLoading(true);
		setCommunicationError("");
		try {
			for (const assignment of assignmentsToRemove) {
				const result = await onRemoveAssignment?.(assignment.id);
				if (result?.error) {
					setCommunicationError(result.error);
					setDestructiveLoading(false);
					setPendingDestructiveAction(null);
					return;
				}
			}

			await onSubmit(buildPayload(action));
			setPendingDestructiveAction(null);
		} finally {
			setDestructiveLoading(false);
		}
	}

	async function confirmDestructiveAction() {
		if (!pendingDestructiveAction) return;
		if (pendingDestructiveAction.type === "delete_rental") {
			await onDelete();
			setPendingDestructiveAction(null);
			return;
		}

		await submitRentalAction(pendingDestructiveAction.action, true);
	}

	function updateCommunicationDraft(patch) {
		setCommunicationDraft((current) => ({
			...current,
			...patch,
		}));
	}

	async function handleSendCommunication() {
		if (!rental?.id || !rental?.tenantId || !onSendCommunication) {
			return;
		}

		setCommunicationLoading(true);
		setCommunicationError("");
		setCommunicationSuccess("");

		try {
			const result = await onSendCommunication({
				tenantId: rental.tenantId,
				rentalId: rental.id,
				applicationId: rental.applicationId || null,
				actionKey: "general_update",
				subjectLine: communicationDraft.subjectLine,
				message: communicationDraft.message,
				stage: "current",
				sendEmail: true,
			});

			if (result?.error) {
				setCommunicationError(result.error);
				setCommunicationLoading(false);
				return;
			}

			setCommunicationSuccess("Update sent.");
			setCommunicationLoading(false);
		} catch {
			setCommunicationError("Failed to send update.");
			setCommunicationLoading(false);
		}
	}

	return (
		<ScreenModal
			open={open}
			onClose={onClose}
			closeLabel="Close rental management"
			maxWidthClass={maxWidthClass}
		>
			<div className="space-y-5">
				<div className="space-y-2">
					<p className="text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
						Rental Management
					</p>
					<h2 className="font-syne text-3xl font-bold text-neutral-950 dark:text-neutral-50">
						{title}
					</h2>
				</div>

				{loading ? (
					<Card>
						<div className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
							<ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden="true" />
							Loading rental details...
						</div>
					</Card>
				) : error ? (
					<Card>
						<p className="text-sm font-medium text-red-600">{error}</p>
					</Card>
				) : (
					<>
						{rental ? (
							<RentalHeaderCard rental={rental} />
						) : null}

						<div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
							<Card>
								<div className="space-y-4">
									<div>
										<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
											Rental Terms
										</h3>
										<p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
											Manage operational state, billing state, pricing, and approved period details.
										</p>
									</div>
									<RentalEditableFields
										form={form}
										onFieldChange={updateField}
										includeRentalStatus
										includeBillingStatus
										includeRate
										includeDeposit
										includeBillingFrequency
										includeOperationalStart
										includeRequestDates
										includeRequestedTrailers={mode === "create"}
										includeNotes={mode === "create"}
										disabledFields={
											approvedTermsLocked
												? {
														billingFrequency: true,
														contractStartDate: true,
													}
												: {}
										}
										noteLabel="Notes / Summary"
										noteRows={5}
									/>
									{approvedTermsLocked ? (
										<p className="text-xs text-neutral-500 dark:text-neutral-400">
											Contract start and billing frequency are locked after approval. Operational start and end date remain editable.
										</p>
									) : null}
								</div>
							</Card>

							<div className="space-y-4">
								<Card>
									<div className="space-y-3">
										<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
											Assign Tenant
										</h3>
										{tenantSelectionLocked ? (
											<div className="space-y-3">
												<div className="surface-subtle rounded-2xl p-4">
													<p className="font-semibold text-neutral-950 dark:text-neutral-50">
														{selectedTenant?.displayName || rental?.tenantName || "Unknown tenant"}
													</p>
													<p className="text-sm text-neutral-600 dark:text-neutral-400">
														{selectedTenant?.primaryEmail || "Tenant locked"}
													</p>
												</div>
											</div>
										) : (
											<>
												<SearchInput
													value={tenantSearch}
													onChange={setTenantSearch}
													placeholder="Search by company, email, or phone"
													className="min-w-0"
												/>
												{tenantOptions.length ? (
													<div className="space-y-3">
														{filteredTenantOptions.length ? (
															filteredTenantOptions.map((tenant) => (
																<label
																	key={tenant.id}
																	className="flex items-center gap-3 rounded-2xl border border-(--border-soft) bg-white/80 px-4 py-3 text-sm text-neutral-800 dark:bg-neutral-950/60 dark:text-neutral-100"
																>
																	<input
																		type="radio"
																		name="rental-tenant"
																		checked={form.tenantId === tenant.id}
																		onChange={() =>
																			setForm((current) => ({
																				...current,
																				tenantId: tenant.id,
																			}))
																		}
																		className="h-4 w-4"
																	/>
																	<div>
																		<p className="font-semibold">
																			{tenant.displayName}
																		</p>
																		<p className="text-neutral-600 dark:text-neutral-400">
																			{tenant.primaryEmail || "No email"}{tenant.primaryPhone ? ` | ${tenant.primaryPhone}` : ""}
																		</p>
																	</div>
																</label>
															))
														) : (
															<p className="text-sm text-neutral-600 dark:text-neutral-400">
																No tenants match this search.
															</p>
														)}
													</div>
												) : (
													<p className="text-sm text-neutral-600 dark:text-neutral-400">
														No tenant accounts are available yet.
													</p>
												)}
											</>
										)}
									</div>
								</Card>

								{showTrailerSelection ? (
									<RentalTrailerChecklist
										title={
											showTrailerApproval
												? "Select Trailers for Approval"
												: "Trailers"
										}
										description={
											showTrailerApproval
												? "Checked trailers will be merged into the parent rental. Unchecked assigned trailers will be removed after confirmation when you save."
												: "Checked trailers are assigned to this rental. Uncheck an assigned trailer and save to unassign it after confirmation."
										}
										searchValue={trailerSearch}
										onSearchChange={setTrailerSearch}
										trailers={filteredTrailerOptions}
										selectedTrailerIds={form.trailerIds}
										onToggleTrailer={toggleTrailer}
										emptyMessage="No trailers match this search."
									/>
								) : null}

								{rental ? <SigningPacketSummary packet={signingPacket} /> : null}

								{rental ? (
									<RentalDocumentUploadCard
										title="Add Rental Document"
										description="Upload supporting documents, revised proposals, or signed paperwork for this rental."
										onUpload={onUploadDocument}
										resetKey={`${rental.id}-${rental.updatedAt ?? ""}`}
									/>
								) : null}
								<RentalDocumentsCard
									title="Documents"
									documents={applicationDocuments}
									emptyTitle="No Documents"
									emptyMessage="No documents are attached to this rental."
								/>
							</div>
						</div>

						{rentalView ? (
							<div className="space-y-4">
								<RentalTimelineGrid timeline={timeline} />
								{rental && onSendCommunication ? (
									<Card>
										<div className="space-y-3">
											<div className="flex flex-wrap items-center justify-between gap-3">
												<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
													Communications & Updates
												</h3>
												<p className="text-sm text-neutral-600 dark:text-neutral-400">
													Send updates directly from this rental.
												</p>
											</div>

											<input
												type="text"
												value={communicationDraft.subjectLine}
												onChange={(event) =>
													updateCommunicationDraft({
														subjectLine: event.target.value,
													})
												}
												className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
												placeholder="Short update subject"
											/>

											<textarea
												value={communicationDraft.message}
												onChange={(event) =>
													updateCommunicationDraft({
														message: event.target.value,
													})
												}
												rows={5}
												className="w-full rounded-2xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
												placeholder="Share the update that should go to the tenant."
											/>

											<div className="flex flex-wrap items-center justify-between gap-3">
												<p className="text-xs text-neutral-500 dark:text-neutral-400">
													This sends a direct rental update without changing workflow state.
												</p>
												<ActionButton
													type="button"
													tone="primary"
													onClick={handleSendCommunication}
													disabled={communicationLoading}
												>
													{communicationLoading ? (
														<ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden="true" />
													) : null}
													Send Update
												</ActionButton>
											</div>
											{communicationSuccess ? (
												<p className="text-sm font-medium text-emerald-600">
													{communicationSuccess}
												</p>
											) : null}
											{communicationError ? (
												<p className="text-sm font-medium text-red-600">
													{communicationError}
												</p>
											) : null}
										</div>
									</Card>
								) : null}
								<RentalBillingCard rental={rental} />
							</div>
						) : null}

						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="flex flex-wrap gap-3">
								<ActionButton
									type="button"
									tone="primary"
									onClick={() => submitRentalAction("save")}
									disabled={submitting || destructiveLoading || !form.tenantId}
								>
									{submitting || destructiveLoading ? (
										<ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden="true" />
									) : (
										<CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
									)}
									Save Rental
								</ActionButton>
								{canSendProposal ? (
									<ActionButton
										type="button"
										tone="positive"
										onClick={() => submitRentalAction(proposalAction)}
										disabled={submitting || destructiveLoading}
									>
										{proposalLabel}
									</ActionButton>
								) : null}
								{canSendProposal ? (
									<ActionButton
										type="button"
										tone="danger"
										onClick={() => submitRentalAction("deny_request")}
										disabled={submitting || destructiveLoading}
									>
										Decline Draft
									</ActionButton>
								) : null}
							</div>

							{canDelete ? (
								<ActionButton
									type="button"
									tone="danger"
									onClick={() =>
										setPendingDestructiveAction({
											type: "delete_rental",
										})
									}
									disabled={deleting}
								>
									{deleting ? (
										<ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden="true" />
									) : (
										<TrashIcon className="h-5 w-5" aria-hidden="true" />
									)}
									Delete Draft
								</ActionButton>
							) : null}
						</div>
						{submitError ? <p className="text-sm font-medium text-red-600">{submitError}</p> : null}
					</>
				)}
			</div>

			<ConfirmActionModal
				open={Boolean(pendingDestructiveAction)}
				onClose={() => setPendingDestructiveAction(null)}
				onConfirm={confirmDestructiveAction}
				title={
					pendingDestructiveAction?.type === "delete_rental"
						? "Delete this draft?"
						: pendingDestructiveAction?.type === "resolve_request"
							? "Decline this draft?"
						: "Unassign selected trailers?"
				}
				message={
					pendingDestructiveAction?.type === "delete_rental"
						? "This will permanently delete this unresolved draft request. This is only safe for drafts that have not entered the operational lifecycle."
						: pendingDestructiveAction?.type === "resolve_request"
							? "This will mark the rental request as declined or cancelled and release any selected trailer changes. Use this only when you are ready to close the request."
						: `${pendingDestructiveAction?.assignments?.length ?? 0} assigned trailer(s) will be removed from this rental and returned to available inventory before the rental is saved.`
				}
				confirmLabel={
					pendingDestructiveAction?.type === "delete_rental"
						? "Delete Draft"
						: pendingDestructiveAction?.type === "resolve_request"
							? "Decline Draft"
						: "Unassign and Save"
				}
				loading={deleting || destructiveLoading}
			/>
		</ScreenModal>
	);
}
