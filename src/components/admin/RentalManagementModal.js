"use client";

import { useEffect, useMemo, useState } from "react";
import {
	ArrowPathIcon,
	CheckCircleIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import { TIMELINE_STAGE_VALUES } from "@/lib/contracts/journey";
import Card from "@/components/ui/Card";
import ScreenModal from "@/components/ui/ScreenModal";
import ActionButton from "@/components/ui/ActionButton";
import StatusBadge from "@/components/admin/StatusBadge";
import SearchInput from "@/components/portal/SearchInput";
import RentalEditableFields from "@/components/rentals/RentalEditableFields";
import {
	getRentalRecordTitle,
	RentalAssignmentsCard,
	RentalDocumentsCard,
	RentalHeaderCard,
} from "@/components/rentals/RentalDetailShared";
import RentalDocumentUploadCard from "@/components/rentals/RentalDocumentUploadCard";
import {
	RentalBillingCard,
	RentalCommunicationsCard,
	RentalSnapshotCard,
	RentalTimelineGrid,
} from "@/components/rentals/RentalActivitySections";

const EMPTY_ARRAY = [];
const TIMELINE_ACTIONS = {
	timeline_sign_documents: {
		label: "Publish: Sign Documents",
		subjectLine: "Sign your rental documents",
		description:
			"Review and sign the required rental documents so your trailer can be released.",
	},
	timeline_review_contract: {
		label: "Publish: Review Contract",
		subjectLine: "Review your contract details",
		description:
			"Review your rental contract details once the document packet is ready.",
	},
	timeline_pick_up_trailer: {
		label: "Publish: Pick Up Trailer",
		subjectLine: "Coordinate trailer pickup",
		description:
			"Coordinate pickup details once your documents and contract steps are complete.",
	},
};

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
		requestedTrailerCount: "",
		requestedTrailerType: "",
		trailerIds: [],
	};
}

function buildCommunicationDraft(rental, application, actionKey = "general_update") {
	const timelineConfig = TIMELINE_ACTIONS[actionKey] ?? null;
	const companyName =
		application?.companyName || rental?.tenantName || "this account";

	return {
		actionKey,
		subjectLine: timelineConfig
			? timelineConfig.subjectLine
			: `Rental update for ${companyName}`,
		message: timelineConfig ? timelineConfig.description : "",
		stage: "current",
		sendEmail: true,
	};
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
	const [removingAssignmentId, setRemovingAssignmentId] = useState("");

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
				requestedTrailerCount: rental.requestedTrailerCount ?? "",
				requestedTrailerType: rental.requestedTrailerType || "",
				trailerIds: [],
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
	const selectedTrailerSet = useMemo(
		() => new Set(form.trailerIds),
		[form.trailerIds]
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
	const communications = rentalView?.communications ?? EMPTY_ARRAY;
	const filteredTrailerOptions = useMemo(() => {
		const query = trailerSearch.trim().toLowerCase();
		if (!query) return availableTrailers;
		return availableTrailers.filter((trailer) =>
			[
				trailer.trailerCode,
				trailer.trailerType,
				trailer.plateNumber,
				trailer.vin,
			]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(query))
		);
	}, [availableTrailers, trailerSearch]);
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
		return {
			action,
			tenantId: form.tenantId,
			status: form.status,
			billingStatus: form.billingStatus,
			billingFrequency: form.billingFrequency,
			rate: form.rate,
			depositAmount: form.depositAmount,
			contractStartDate: form.contractStartDate,
			operationalStartDate: form.operationalStartDate,
			endDate: form.endDate,
			requestSummary: form.requestSummary,
			requestedTrailerCount: form.requestedTrailerCount
				? Number(form.requestedTrailerCount)
				: undefined,
			requestedTrailerType: form.requestedTrailerType,
			trailerIds: form.trailerIds,
		};
	}

	function updateCommunicationDraft(patch) {
		setCommunicationDraft((current) => {
			if (
				typeof patch.actionKey === "string" &&
				patch.actionKey !== current.actionKey
			) {
				return buildCommunicationDraft(
					rental,
					rentalView?.application ?? rental?.application ?? null,
					patch.actionKey
				);
			}

			return {
				...current,
				...patch,
			};
		});
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
				actionKey: communicationDraft.actionKey,
				subjectLine: communicationDraft.subjectLine,
				message: communicationDraft.message,
				stage: communicationDraft.stage,
				sendEmail: communicationDraft.sendEmail,
			});

			if (result?.error) {
				setCommunicationError(result.error);
				setCommunicationLoading(false);
				return;
			}

			setCommunicationSuccess(
				communicationDraft.actionKey === "general_update"
					? "Update sent."
					: "Timeline step published."
			);
			setCommunicationLoading(false);
		} catch {
			setCommunicationError("Failed to send update.");
			setCommunicationLoading(false);
		}
	}

	async function handleRemoveAssignment(assignmentId) {
		if (!rental?.id || !onRemoveAssignment) {
			return;
		}

		setRemovingAssignmentId(assignmentId);
		try {
			const result = await onRemoveAssignment(assignmentId);
			if (result?.error) {
				setCommunicationError(result.error);
			}
		} finally {
			setRemovingAssignmentId("");
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

						<div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
							<Card>
								<RentalEditableFields
									form={form}
									onFieldChange={updateField}
									includeRentalStatus
									includeBillingStatus
									includeRate
									includeDeposit
									includeOperationalStart
									noteLabel="Notes / Summary"
									noteRows={6}
								/>
							</Card>

							<div className="space-y-4">
								<RentalAssignmentsCard
									assignments={rental?.assignments ?? EMPTY_ARRAY}
									title="Assignments"
									emptyTitle="No Assignments"
									emptyMessage="No trailer assignments are attached to this rental."
									onRemoveAssignment={rental ? handleRemoveAssignment : null}
									removingAssignmentId={removingAssignmentId}
								/>

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
									<Card>
										<div className="space-y-3">
											<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
												{showTrailerApproval
													? "Select Trailers for Approval"
													: "Assign Trailers"}
											</h3>
											<p className="text-sm text-neutral-600 dark:text-neutral-400">
												{showTrailerApproval
													? "Choose the available trailers that should be merged into the parent rental."
													: "Choose any available trailers that should be linked as soon as this rental is saved."}
											</p>
											<SearchInput
												value={trailerSearch}
												onChange={setTrailerSearch}
												placeholder="Search by code, type, plate, or VIN"
												className="min-w-0"
											/>
											{availableTrailers.length ? (
												<div className="space-y-3">
													{filteredTrailerOptions.length ? (
														filteredTrailerOptions.map((trailer) => (
															<label
																key={trailer.id}
																className="flex items-center gap-3 rounded-2xl border border-(--border-soft) bg-white/80 px-4 py-3 text-sm text-neutral-800 dark:bg-neutral-950/60 dark:text-neutral-100"
															>
																<input
																	type="checkbox"
																	checked={selectedTrailerSet.has(trailer.id)}
																	onChange={() => toggleTrailer(trailer.id)}
																	className="h-4 w-4 rounded border-neutral-300"
																/>
																<div>
																	<p className="font-semibold">
																		{trailer.trailerCode || trailer.vin || trailer.id}
																	</p>
																	<p className="text-neutral-600 dark:text-neutral-400">
																		{trailer.trailerType || "Trailer"} | {trailer.plateNumber || "No plate"}
																	</p>
																</div>
															</label>
														))
													) : (
														<p className="text-sm text-neutral-600 dark:text-neutral-400">
															No available trailers match this search.
														</p>
													)}
												</div>
											) : (
												<p className="text-sm text-neutral-600 dark:text-neutral-400">
													No currently available trailers are ready for assignment.
												</p>
											)}
										</div>
									</Card>
								) : null}

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
								<div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
									<RentalSnapshotCard rental={rental} />
									<RentalBillingCard rental={rental} />
								</div>
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

											<select
												value={communicationDraft.actionKey}
												onChange={(event) =>
													updateCommunicationDraft({
														actionKey: event.target.value,
													})
												}
												className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
											>
												<option value="general_update">General Rental Update</option>
												{Object.entries(TIMELINE_ACTIONS).map(([value, config]) => (
													<option key={value} value={value}>
														{config.label}
													</option>
												))}
											</select>

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

											{communicationDraft.actionKey !== "general_update" ? (
												<>
													<select
														value={communicationDraft.stage}
														onChange={(event) =>
															updateCommunicationDraft({
																stage: event.target.value,
															})
														}
														className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
													>
														{TIMELINE_STAGE_VALUES.map((stage) => (
															<option key={stage} value={stage}>
																{stage
																	.split("_")
																	.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
																	.join(" ")}
															</option>
														))}
													</select>
													<label className="flex items-center gap-3 rounded-xl border border-(--border-soft) px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
														<input
															type="checkbox"
															checked={Boolean(communicationDraft.sendEmail)}
															onChange={(event) =>
																updateCommunicationDraft({
																	sendEmail: event.target.checked,
																})
															}
															className="h-4 w-4 rounded border-(--border-soft)"
														/>
														Email the tenant when this timeline step is published
													</label>
												</>
											) : null}

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
													{communicationDraft.actionKey === "general_update"
														? "This sends a direct rental update without changing workflow state."
														: "This publishes a rental-scoped timeline step and can notify the tenant immediately."}
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
								<RentalCommunicationsCard communications={communications} />
							</div>
						) : null}

						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="flex flex-wrap gap-3">
								<ActionButton
									type="button"
									tone="primary"
									onClick={() => onSubmit(buildPayload("save"))}
									disabled={submitting || !form.tenantId}
								>
									{submitting ? (
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
										onClick={() => onSubmit(buildPayload(proposalAction))}
										disabled={submitting}
									>
										{proposalLabel}
									</ActionButton>
								) : null}
								{canSendProposal ? (
									<ActionButton
										type="button"
										tone="danger"
										onClick={() => onSubmit(buildPayload("deny_request"))}
										disabled={submitting}
									>
										Decline Draft
									</ActionButton>
								) : null}
							</div>

							{canDelete ? (
								<ActionButton
									type="button"
									tone="danger"
									onClick={onDelete}
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
		</ScreenModal>
	);
}
