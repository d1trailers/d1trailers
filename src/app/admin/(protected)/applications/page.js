"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import StateCard from "@/components/admin/StateCard";
import StatusBadge from "@/components/admin/StatusBadge";
import { LoadingCardGrid, LoadingPanel } from "@/components/ui/LoadingSkeleton";

function formatDate(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString();
}

function toInputDate(value) {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return date.toISOString().slice(0, 10);
}

function toInputNumber(value) {
	if (typeof value === "number" && Number.isFinite(value)) {
		return String(value);
	}
	return "";
}

function buildTrailerLabel(trailer) {
	return `${trailer?.trailerType || "Trailer"} | ${trailer?.plateNumber || "No plate"} | ${trailer?.status || "Unknown"}`;
}

function buildTrailerHover(trailer) {
	return [
		trailer?.trailerType || "Trailer",
		`Plate: ${trailer?.plateNumber || "N/A"}`,
		`VIN: ${trailer?.vin || "N/A"}`,
		`Status: ${trailer?.status || "Unknown"}`,
	]
		.filter(Boolean)
		.join("\n");
}

function getDefaultDraft(details) {
	const firstRental = Array.isArray(details?.rentals) ? details.rentals[0] : null;
	const selectedTrailerRecordIds = Array.isArray(firstRental?.trailers)
		? firstRental.trailers.map((trailer) => trailer.recordId).filter(Boolean)
		: [];

	return {
		reviewNotes: details?.customer?.reviewNotes ?? "",
		trailerRecordIds: selectedTrailerRecordIds,
		trailerPickerValue: "",
		rate: toInputNumber(firstRental?.rate),
		depositAmount: toInputNumber(firstRental?.depositAmount),
		contractStartDate: toInputDate(firstRental?.contractStartDate),
		operationalStartDate: toInputDate(firstRental?.operationalStartDate),
		endDate: toInputDate(firstRental?.endDate),
	};
}

function FieldLabel({ children }) {
	return (
		<label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
			{children}
		</label>
	);
}

function ActionButton({ tone = "neutral", loading = false, children, ...props }) {
	const toneClass =
		tone === "danger"
			? "bg-red-700 hover:bg-red-800 text-neutral-50"
			: tone === "primary"
				? "bg-(--branding-700) hover:bg-(--branding-800) text-neutral-50"
				: "surface-subtle text-neutral-800 dark:text-neutral-100";

	return (
		<button
			{...props}
			disabled={loading || props.disabled}
			className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${toneClass} ${
				props.className || ""
			}`}
		>
			{loading ? "Working..." : children}
		</button>
	);
}

export default function AdminApplicationsPage() {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [expandedCustomerId, setExpandedCustomerId] = useState(null);
	const [detailByCustomerId, setDetailByCustomerId] = useState({});
	const [detailLoadingByCustomerId, setDetailLoadingByCustomerId] = useState({});
	const [detailErrorByCustomerId, setDetailErrorByCustomerId] = useState({});
	const [decisionDraftByCustomerId, setDecisionDraftByCustomerId] = useState({});
	const [actionLoadingByCustomerId, setActionLoadingByCustomerId] = useState({});
	const [actionErrorByCustomerId, setActionErrorByCustomerId] = useState({});

	const loadApplications = useCallback(async ({ background = false } = {}) => {
		if (!background) {
			setLoading(true);
		}

		try {
			const res = await fetch("/api/admin/applications");
			const json = await res.json().catch(() => []);

			if (!res.ok) {
				setError(
					typeof json?.error === "string"
						? json.error
						: "Failed to load applications."
				);
				if (!background) setLoading(false);
				return;
			}

			setData(Array.isArray(json) ? json : []);
			setError("");
			if (!background) setLoading(false);
		} catch {
			setError("Failed to load applications.");
			if (!background) setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadApplications();
	}, [loadApplications]);

	async function loadApplicationDetails(customerId) {
		if (!customerId) return;

		setDetailLoadingByCustomerId((current) => ({ ...current, [customerId]: true }));
		setDetailErrorByCustomerId((current) => ({ ...current, [customerId]: "" }));

		try {
			const res = await fetch(`/api/admin/applications/${encodeURIComponent(customerId)}`);
			const json = await res.json().catch(() => ({}));

			if (!res.ok) {
				setDetailErrorByCustomerId((current) => ({
					...current,
					[customerId]:
						typeof json?.error === "string"
							? json.error
							: "Failed to load application details.",
				}));
				setDetailLoadingByCustomerId((current) => ({
					...current,
					[customerId]: false,
				}));
				return;
			}

			setDetailByCustomerId((current) => ({ ...current, [customerId]: json }));
			setDecisionDraftByCustomerId((current) => ({
				...current,
				[customerId]: getDefaultDraft(json),
			}));
			setDetailLoadingByCustomerId((current) => ({ ...current, [customerId]: false }));
		} catch {
			setDetailErrorByCustomerId((current) => ({
				...current,
				[customerId]: "Failed to load application details.",
			}));
			setDetailLoadingByCustomerId((current) => ({ ...current, [customerId]: false }));
		}
	}

	function updateDecisionDraft(customerId, field, value) {
		setDecisionDraftByCustomerId((current) => ({
			...current,
			[customerId]: {
				...(current[customerId] || {}),
				[field]: value,
			},
		}));
	}

	function addSelectedTrailer(customerId) {
		setDecisionDraftByCustomerId((current) => {
			const draft = current[customerId] || {};
			const nextTrailerRecordId = draft.trailerPickerValue || "";
			if (!nextTrailerRecordId) return current;

			const nextTrailerRecordIds = Array.from(
				new Set([...(draft.trailerRecordIds || []), nextTrailerRecordId])
			);

			return {
				...current,
				[customerId]: {
					...draft,
					trailerRecordIds: nextTrailerRecordIds,
					trailerPickerValue: "",
				},
			};
		});
	}

	function removeSelectedTrailer(customerId, trailerRecordId) {
		setDecisionDraftByCustomerId((current) => {
			const draft = current[customerId] || {};
			return {
				...current,
				[customerId]: {
					...draft,
					trailerRecordIds: (draft.trailerRecordIds || []).filter(
						(recordId) => recordId !== trailerRecordId
					),
				},
			};
		});
	}

	async function submitDecision(customerId, action) {
		const draft = decisionDraftByCustomerId[customerId] || {};
		const payload = {
			action,
			reviewNotes: draft.reviewNotes || "",
		};

		if (action === "approve") {
			if (!Array.isArray(draft.trailerRecordIds) || !draft.trailerRecordIds.length) {
				setActionErrorByCustomerId((current) => ({
					...current,
					[customerId]: "Approval requires at least one trailer selection.",
				}));
				return;
			}

			if (!draft.rate || Number.isNaN(Number(draft.rate))) {
				setActionErrorByCustomerId((current) => ({
					...current,
					[customerId]: "Approval requires a valid rate.",
				}));
				return;
			}

			if (!draft.depositAmount || Number.isNaN(Number(draft.depositAmount))) {
				setActionErrorByCustomerId((current) => ({
					...current,
					[customerId]: "Approval requires a valid deposit amount.",
				}));
				return;
			}

			if (!draft.contractStartDate) {
				setActionErrorByCustomerId((current) => ({
					...current,
					[customerId]: "Approval requires a contract start date.",
				}));
				return;
			}

			payload.trailerRecordIds = draft.trailerRecordIds;
			payload.rate = draft.rate;
			payload.depositAmount = draft.depositAmount;
			payload.contractStartDate = draft.contractStartDate;
			payload.operationalStartDate = draft.operationalStartDate || draft.contractStartDate;
			payload.endDate = draft.endDate || undefined;
		}

		setActionLoadingByCustomerId((current) => ({ ...current, [customerId]: true }));
		setActionErrorByCustomerId((current) => ({ ...current, [customerId]: "" }));

		try {
			const res = await fetch(
				`/api/admin/applications/${encodeURIComponent(customerId)}/decision`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				}
			);

			const json = await res.json().catch(() => ({}));
			if (!res.ok) {
				setActionErrorByCustomerId((current) => ({
					...current,
					[customerId]:
						typeof json?.error === "string"
							? json.error
							: "Failed to process application decision.",
				}));
				setActionLoadingByCustomerId((current) => ({
					...current,
					[customerId]: false,
				}));
				return;
			}

			await loadApplications({ background: true });
			await loadApplicationDetails(customerId);
			setActionLoadingByCustomerId((current) => ({ ...current, [customerId]: false }));
		} catch {
			setActionErrorByCustomerId((current) => ({
				...current,
				[customerId]: "Failed to process application decision.",
			}));
			setActionLoadingByCustomerId((current) => ({ ...current, [customerId]: false }));
		}
	}

	if (loading) {
		return (
			<div className="space-y-4">
				<LoadingPanel
					title="Loading Applications"
					subtitle="Fetching the application review queue."
				/>
				<LoadingCardGrid count={4} />
			</div>
		);
	}

	if (error) {
		return <StateCard title="Applications Unavailable" message={error} tone="error" />;
	}

	if (!data.length) {
		return (
			<StateCard
				title="No Applications"
				message="There are no customers currently in submitted, review, needs info, or awaiting payment states."
			/>
		);
	}

	return (
		<div className="space-y-4">
			{data.map((application) => {
				const isExpanded = expandedCustomerId === application.customerId;
				const details = detailByCustomerId[application.customerId];
				const detailLoading = detailLoadingByCustomerId[application.customerId];
				const detailError = detailErrorByCustomerId[application.customerId];
				const draft = decisionDraftByCustomerId[application.customerId] || {};
				const actionLoading = actionLoadingByCustomerId[application.customerId];
				const actionError = actionErrorByCustomerId[application.customerId];
				const trailerCatalog = (() => {
					const trailers = [];
					const seen = new Set();
					for (const trailer of details?.availableTrailers || []) {
						if (trailer?.recordId && !seen.has(trailer.recordId)) {
							seen.add(trailer.recordId);
							trailers.push(trailer);
						}
					}
					for (const rental of details?.rentals || []) {
						for (const trailer of rental?.trailers || []) {
							if (trailer?.recordId && !seen.has(trailer.recordId)) {
								seen.add(trailer.recordId);
								trailers.push(trailer);
							}
						}
					}
					return trailers;
				})();
				const selectedTrailers = trailerCatalog.filter((trailer) =>
					(draft.trailerRecordIds || []).includes(trailer.recordId)
				);
				const availableTrailerChoices = trailerCatalog.filter(
					(trailer) => !(draft.trailerRecordIds || []).includes(trailer.recordId)
				);

				return (
					<Card key={application.customerId} className="motion-enter-delayed">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<h2 className="font-semibold text-lg text-neutral-950 dark:text-neutral-50">
									{application.companyName || "Unknown Company"}
								</h2>
								<p className="text-sm text-neutral-600 dark:text-neutral-400">
									{application.primaryEmail || "-"}
								</p>
							</div>
							<div className="flex items-center gap-2">
								<StatusBadge status={application.status} />
								<ActionButton
									type="button"
									onClick={() => {
										if (isExpanded) {
											setExpandedCustomerId(null);
											return;
										}
										setExpandedCustomerId(application.customerId);
										if (!details) {
											loadApplicationDetails(application.customerId);
										}
									}}
								>
									{isExpanded ? "Close Review" : "Review"}
								</ActionButton>
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-neutral-600 dark:text-neutral-400">
							<p>
								<span className="font-semibold">Submitted At: </span>
								{formatDate(application.submittedAt)}
							</p>
							<p>
								<span className="font-semibold">Reviewed At: </span>
								{formatDate(application.reviewedAt)}
							</p>
						</div>
						{application.reviewNotes ? (
							<p className="text-sm text-neutral-700 dark:text-neutral-300">
								<span className="font-semibold">Review Notes: </span>
								{application.reviewNotes}
							</p>
						) : null}

						{isExpanded ? (
							<div className="space-y-4 border-t border-(--border-soft) pt-4">
								{detailLoading ? (
									<p className="text-sm text-neutral-600 dark:text-neutral-400">
										Loading application details...
									</p>
								) : null}

								{detailError ? (
									<p className="text-sm text-red-600 font-medium">{detailError}</p>
								) : null}

								{details && !detailLoading ? (
									<>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
											<div className="space-y-2">
												<p className="font-semibold text-neutral-900 dark:text-neutral-100">
													Rental Records
												</p>
												{details.rentals?.length ? (
													details.rentals.map((rental) => (
														<div key={rental.recordId} className="surface-subtle rounded-lg p-3">
															<p className="font-semibold">{rental.rentalId || rental.recordId}</p>
															<p>Status: {rental.status || "-"}</p>
															<p>Contract Start: {formatDate(rental.contractStartDate)}</p>
															<p>Operational Start: {formatDate(rental.operationalStartDate)}</p>
															<p>End Date: {formatDate(rental.endDate)}</p>
															<p>Rate: {rental.rate ?? "-"}</p>
															<p>Deposit: {rental.depositAmount ?? "-"}</p>
															<p>Assignments: {rental.assignments?.length ?? 0}</p>
															<p>
																Trailers: {rental.trailers?.length
																	? rental.trailers.map((trailer) => `${trailer.trailerType || "Trailer"} (${trailer.plateNumber || "No plate"})`).join(", ")
																	: "-"}
															</p>
														</div>
													))
												) : (
													<p className="text-neutral-600 dark:text-neutral-400">No rentals linked.</p>
												)}
											</div>

											<div className="space-y-2">
												<p className="font-semibold text-neutral-900 dark:text-neutral-100">
													Customer Documents
												</p>
												{details.documents?.length ? (
													details.documents.map((document) => (
														<div key={document.id} className="surface-subtle rounded-lg p-3">
															<p className="font-semibold">{document.type || "Document"}</p>
															<p>Category: {document.category || "-"}</p>
															<p>Uploaded: {formatDate(document.uploadedAt)}</p>
															{document.attachments?.[0]?.url ? (
																<a className="underline text-sm" href={document.attachments[0].url} target="_blank" rel="noopener noreferrer">
																	View Attachment
																</a>
															) : (
																<p>No attachment available.</p>
															)}
														</div>
													))
												) : (
													<p className="text-neutral-600 dark:text-neutral-400">No customer-level documents.</p>
												)}
											</div>
										</div>

										{details.conflicts?.length ? (
											<div className="space-y-2">
												<p className="font-semibold text-red-700 dark:text-red-400">Current Assignment Conflicts</p>
												{details.conflicts.map((conflict, index) => (
													<div
														key={`${conflict.trailerRecordId}-${index}`}
														className="rounded-lg border border-red-300 bg-red-50/70 dark:bg-red-950/30 p-3 text-sm"
													>
														<p className="font-semibold">{conflict.message}</p>
														<p>Trailer: {conflict.trailerId || conflict.trailerRecordId}</p>
														<p>Blocking Assignments: {conflict.assignments?.length ?? 0}</p>
													</div>
												))}
											</div>
										) : null}

										<div className="space-y-3">
											<FieldLabel>
												<span className="font-semibold">Review Notes</span>
												<textarea
													value={draft.reviewNotes || ""}
													onChange={(event) => updateDecisionDraft(application.customerId, "reviewNotes", event.target.value)}
													className="w-full min-h-24 p-3 rounded-lg border border-(--border-soft) bg-neutral-50 dark:bg-neutral-900/40"
													placeholder="Add notes for this decision"
												/>
											</FieldLabel>

											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div className="md:col-span-2 space-y-2">
													<span className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300">Trailers</span>
													<div className="rounded-lg border border-(--border-soft) bg-neutral-50 dark:bg-neutral-900/40 p-3 space-y-3">
														<div className="flex flex-wrap gap-2 min-h-10">
															{selectedTrailers.length ? selectedTrailers.map((trailer) => (
																<button
																	key={trailer.recordId}
																	type="button"
																	title={buildTrailerHover(trailer)}
																	onClick={() => removeSelectedTrailer(application.customerId, trailer.recordId)}
																	className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-neutral-950 border border-(--border-soft) px-3 py-1.5 text-sm text-neutral-800 dark:text-neutral-100"
																>
																	<span>{trailer.trailerType || "Trailer"}</span>
																	<span className="text-neutral-500">{trailer.plateNumber || "No plate"}</span>
																	<span className="text-red-600">x</span>
																</button>
															)) : <span className="text-sm text-neutral-500">No trailers selected yet.</span>}
														</div>

														<div className="flex flex-col md:flex-row gap-2">
															<select
																value={draft.trailerPickerValue || ""}
																onChange={(event) => updateDecisionDraft(application.customerId, "trailerPickerValue", event.target.value)}
																className="flex-1 p-3 rounded-lg border border-(--border-soft) bg-white dark:bg-neutral-950/50"
															>
																<option value="">Add trailer from available list</option>
																{availableTrailerChoices.map((trailer) => (
																	<option key={trailer.recordId} value={trailer.recordId}>
																		{buildTrailerLabel(trailer)}
																	</option>
																))}
															</select>
															<button
																type="button"
																onClick={() => addSelectedTrailer(application.customerId)}
																disabled={!draft.trailerPickerValue}
																className="rounded-lg px-4 py-3 bg-(--branding-700) text-neutral-50 font-semibold disabled:opacity-60"
															>
																+ Add Trailer
															</button>
														</div>
													</div>
												</div>

												<FieldLabel>
													<span className="font-semibold">Rate</span>
													<input
														type="number"
														step="0.01"
														min="0"
														value={draft.rate || ""}
														onChange={(event) => updateDecisionDraft(application.customerId, "rate", event.target.value)}
														className="w-full p-3 rounded-lg border border-(--border-soft) bg-neutral-50 dark:bg-neutral-900/40"
														placeholder="475.00"
													/>
												</FieldLabel>
												<FieldLabel>
													<span className="font-semibold">Deposit Amount</span>
													<input
														type="number"
														step="0.01"
														min="0"
														value={draft.depositAmount || ""}
														onChange={(event) => updateDecisionDraft(application.customerId, "depositAmount", event.target.value)}
														className="w-full p-3 rounded-lg border border-(--border-soft) bg-neutral-50 dark:bg-neutral-900/40"
														placeholder="500.00"
													/>
												</FieldLabel>
												<FieldLabel>
													<span className="font-semibold">Contract Start Date</span>
													<input
														type="date"
														value={draft.contractStartDate || ""}
														onChange={(event) => updateDecisionDraft(application.customerId, "contractStartDate", event.target.value)}
														className="w-full p-3 rounded-lg border border-(--border-soft) bg-neutral-50 dark:bg-neutral-900/40"
													/>
												</FieldLabel>
												<FieldLabel>
													<span className="font-semibold">Operational Start Date</span>
													<input
														type="date"
														value={draft.operationalStartDate || ""}
														onChange={(event) => updateDecisionDraft(application.customerId, "operationalStartDate", event.target.value)}
														className="w-full p-3 rounded-lg border border-(--border-soft) bg-neutral-50 dark:bg-neutral-900/40"
													/>
												</FieldLabel>
												<FieldLabel>
													<span className="font-semibold">End Date</span>
													<input
														type="date"
														value={draft.endDate || ""}
														onChange={(event) => updateDecisionDraft(application.customerId, "endDate", event.target.value)}
														className="w-full p-3 rounded-lg border border-(--border-soft) bg-neutral-50 dark:bg-neutral-900/40"
													/>
												</FieldLabel>
											</div>

											<div className="space-y-2 text-sm">
												<p className="font-semibold text-neutral-900 dark:text-neutral-100">Assignment Timeline</p>
												{details.rentals?.some((rental) => rental.assignments?.length) ? (
													details.rentals.flatMap((rental) =>
														(rental.assignments || []).map((assignment) => (
															<div key={assignment.assignmentId} className="surface-subtle rounded-lg p-3">
																<p className="font-semibold">{rental.rentalId} | {assignment.status || "-"}</p>
																<p>Start: {formatDate(assignment.startDate)} | End: {formatDate(assignment.endDate)}</p>
																<p>
																	Trailers: {assignment.trailers?.length
																		? assignment.trailers.map((trailer) => `${trailer.trailerType || "Trailer"} (${trailer.plateNumber || "No plate"})`).join(", ")
																		: "-"}
																</p>
															</div>
														))
													)
												) : (
													<p className="text-neutral-600 dark:text-neutral-400">No assignments recorded yet.</p>
												)}
											</div>

											{actionError ? <p className="text-sm text-red-600 font-medium">{actionError}</p> : null}

											<div className="flex flex-wrap gap-2">
												<ActionButton
													type="button"
													tone="primary"
													loading={Boolean(actionLoading)}
													onClick={() => submitDecision(application.customerId, "approve")}
													disabled={!trailerCatalog.length}
												>
													Approve Application
												</ActionButton>
												<ActionButton type="button" loading={Boolean(actionLoading)} onClick={() => submitDecision(application.customerId, "request_info")}>
													Request More Info
												</ActionButton>
												<ActionButton type="button" tone="danger" loading={Boolean(actionLoading)} onClick={() => submitDecision(application.customerId, "deny")}>
													Deny Application
												</ActionButton>
											</div>
										</div>
									</>
								) : null}
							</div>
						) : null}
					</Card>
				);
			})}
		</div>
	);
}
