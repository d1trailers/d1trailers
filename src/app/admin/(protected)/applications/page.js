"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import StateCard from "@/components/admin/StateCard";
import StatusBadge from "@/components/admin/StatusBadge";
import { LoadingCardGrid, LoadingPanel } from "@/components/ui/LoadingSkeleton";
import {
	JOURNEY_ITEM_DEFINITIONS,
	JOURNEY_ITEM_KEYS,
	TIMELINE_STAGE_VALUES,
} from "@/lib/contracts/journey";

const PAYLOAD_FIELDS = [
	["ownerFirstName", "Owner First Name"],
	["ownerLastName", "Owner Last Name"],
	["partnerFirstName", "Partner First Name"],
	["partnerLastName", "Partner Last Name"],
	["email", "Email"],
	["phone", "Phone"],
	["companyName", "Company Name"],
	["companyAddress", "Company Address"],
	["companyCity", "Company City"],
	["companyRegion", "Company Region"],
	["companyZip", "Company Zip"],
	["ein", "EIN"],
	["mcNumber", "MC Number"],
	["usdot", "USDOT"],
	["rentalDuration", "Rental Duration"],
	["ref1Name", "Reference 1"],
	["ref1Phone", "Reference 1 Phone"],
	["ref2Name", "Reference 2"],
	["ref2Phone", "Reference 2 Phone"],
	["ref3Name", "Reference 3"],
	["ref3Phone", "Reference 3 Phone"],
];

const TIMELINE_CONTROL_ITEMS = [
	JOURNEY_ITEM_KEYS.signDocuments,
	JOURNEY_ITEM_KEYS.reviewContract,
	JOURNEY_ITEM_KEYS.pickUpTrailer,
];

const TIMELINE_DESCRIPTION_DEFAULTS = {
	[JOURNEY_ITEM_KEYS.signDocuments]:
		"Review and sign the required rental documents so your trailer can be released.",
	[JOURNEY_ITEM_KEYS.reviewContract]:
		"Review your rental contract details once the document packet is ready.",
	[JOURNEY_ITEM_KEYS.pickUpTrailer]:
		"Coordinate pickup details once your documents and contract steps are complete.",
};

function formatDate(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString();
}

function capitalize(value) {
	if (!value) return "";
	return value.charAt(0).toUpperCase() + value.slice(1);
}

function ActionButton({
	children,
	tone = "primary",
	className = "",
	...props
}) {
	const tones = {
		primary: "bg-(--branding-700) text-neutral-50 hover:bg-(--branding-800)",
		positive: "bg-emerald-600 text-white hover:bg-emerald-700",
		neutral:
			"border border-(--border-soft) text-neutral-800 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-900",
		danger: "bg-red-600 text-white hover:bg-red-700",
	};

	return (
		<button
			{...props}
			className={`rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60 ${tones[tone]} ${className}`}
		>
			{children}
		</button>
	);
}

function buildTimelineDrafts(items = []) {
	return Object.fromEntries(
		TIMELINE_CONTROL_ITEMS.map((itemKey) => {
			const existing = items.find((item) => item.item_key === itemKey);
			return [
				itemKey,
				{
					stage: existing?.stage || "upcoming",
					description:
						existing?.description ||
						TIMELINE_DESCRIPTION_DEFAULTS[itemKey] ||
						"",
					sendUpdateEmail: false,
				},
			];
		}),
	);
}

function sortTimelineItems(items = []) {
	return [...items].sort((left, right) => {
		if ((left.sort_order ?? 100) !== (right.sort_order ?? 100)) {
			return (left.sort_order ?? 100) - (right.sort_order ?? 100);
		}
		return String(left.created_at).localeCompare(String(right.created_at));
	});
}

export default function AdminApplicationsPage() {
	const [applications, setApplications] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [expandedId, setExpandedId] = useState("");
	const [detailsById, setDetailsById] = useState({});
	const [detailLoadingById, setDetailLoadingById] = useState({});
	const [detailErrorById, setDetailErrorById] = useState({});
	const [notesById, setNotesById] = useState({});
	const [timelineDraftsById, setTimelineDraftsById] = useState({});
	const [actionLoadingById, setActionLoadingById] = useState({});
	const [actionErrorById, setActionErrorById] = useState({});
	const [timelineSavingById, setTimelineSavingById] = useState({});
	const [timelineErrorById, setTimelineErrorById] = useState({});
	const [timelineSuccessById, setTimelineSuccessById] = useState({});

	async function loadApplications() {
		try {
			const res = await fetch("/api/admin/applications");
			const json = await res.json().catch(() => []);

			if (!res.ok) {
				setError(
					typeof json?.error === "string"
						? json.error
						: "Failed to load applications.",
				);
				setLoading(false);
				return;
			}

			setApplications(Array.isArray(json) ? json : []);
			setError("");
			setLoading(false);
		} catch {
			setError("Failed to load applications.");
			setLoading(false);
		}
	}

	useEffect(() => {
		const frame = window.requestAnimationFrame(() => {
			void loadApplications();
		});

		return () => {
			window.cancelAnimationFrame(frame);
		};
	}, []);

	async function loadDetails(applicationId) {
		if (!applicationId || detailLoadingById[applicationId]) return;

		setDetailLoadingById((current) => ({ ...current, [applicationId]: true }));
		setDetailErrorById((current) => ({ ...current, [applicationId]: "" }));

		try {
			const res = await fetch(
				`/api/admin/applications/${encodeURIComponent(applicationId)}`,
			);
			const json = await res.json().catch(() => ({}));

			if (!res.ok) {
				setDetailErrorById((current) => ({
					...current,
					[applicationId]:
						typeof json?.error === "string"
							? json.error
							: "Failed to load application details.",
				}));
				setDetailLoadingById((current) => ({
					...current,
					[applicationId]: false,
				}));
				return;
			}

			setDetailsById((current) => ({ ...current, [applicationId]: json }));
			setNotesById((current) => ({
				...current,
				[applicationId]: json.review_notes || "",
			}));
			setTimelineDraftsById((current) => ({
				...current,
				[applicationId]: buildTimelineDrafts(json.timeline_items || []),
			}));
			setDetailLoadingById((current) => ({
				...current,
				[applicationId]: false,
			}));
		} catch {
			setDetailErrorById((current) => ({
				...current,
				[applicationId]: "Failed to load application details.",
			}));
			setDetailLoadingById((current) => ({
				...current,
				[applicationId]: false,
			}));
		}
	}

	async function submitAction(applicationId, action) {
		setActionLoadingById((current) => ({
			...current,
			[applicationId]: action,
		}));
		setActionErrorById((current) => ({ ...current, [applicationId]: "" }));

		try {
			const res = await fetch(
				`/api/admin/applications/${encodeURIComponent(applicationId)}/decision`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						action,
						reviewNotes: notesById[applicationId] || "",
					}),
				},
			);
			const json = await res.json().catch(() => ({}));

			if (!res.ok) {
				setActionErrorById((current) => ({
					...current,
					[applicationId]:
						typeof json?.error === "string"
							? json.error
							: "Failed to update application.",
				}));
				setActionLoadingById((current) => ({
					...current,
					[applicationId]: "",
				}));
				return;
			}

			setActionLoadingById((current) => ({ ...current, [applicationId]: "" }));
			await Promise.all([loadApplications(), loadDetails(applicationId)]);
		} catch {
			setActionErrorById((current) => ({
				...current,
				[applicationId]: "Failed to update application.",
			}));
			setActionLoadingById((current) => ({ ...current, [applicationId]: "" }));
		}
	}

	function updateTimelineDraft(applicationId, itemKey, patch) {
		setTimelineDraftsById((current) => ({
			...current,
			[applicationId]: {
				...(current[applicationId] || {}),
				[itemKey]: {
					...current[applicationId]?.[itemKey],
					...patch,
				},
			},
		}));
	}

	async function submitTimelineUpdate(applicationId, itemKey) {
		const draft = timelineDraftsById[applicationId]?.[itemKey];
		if (!draft) return;

		setTimelineSavingById((current) => ({
			...current,
			[applicationId]: itemKey,
		}));
		setTimelineErrorById((current) => ({ ...current, [applicationId]: "" }));
		setTimelineSuccessById((current) => ({ ...current, [applicationId]: "" }));

		try {
			const res = await fetch(
				`/api/admin/applications/${encodeURIComponent(applicationId)}/timeline`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						itemKey,
						stage: draft.stage,
						description: draft.description,
						sendUpdateEmail: draft.sendUpdateEmail,
					}),
				},
			);
			const json = await res.json().catch(() => ({}));

			if (!res.ok) {
				setTimelineErrorById((current) => ({
					...current,
					[applicationId]:
						typeof json?.error === "string"
							? json.error
							: "Failed to save timeline update.",
				}));
				setTimelineSavingById((current) => ({
					...current,
					[applicationId]: "",
				}));
				return;
			}

			setTimelineSuccessById((current) => ({
				...current,
				[applicationId]: "Timeline update saved.",
			}));
			await loadDetails(applicationId);
			setTimelineSavingById((current) => ({ ...current, [applicationId]: "" }));
		} catch {
			setTimelineErrorById((current) => ({
				...current,
				[applicationId]: "Failed to save timeline update.",
			}));
			setTimelineSavingById((current) => ({ ...current, [applicationId]: "" }));
		}
	}

	const sortedApplications = useMemo(() => applications, [applications]);

	if (loading) {
		return (
			<div className="space-y-4">
				<LoadingPanel
					title="Loading Applications"
					subtitle="Fetching applicant records from the new tenant platform."
				/>
				<LoadingCardGrid count={4} />
			</div>
		);
	}

	if (error) {
		return (
			<StateCard
				title="Applications Unavailable"
				message={error}
				tone="error"
			/>
		);
	}

	if (!sortedApplications.length) {
		return (
			<StateCard
				title="No Applications Yet"
				message="Applications submitted through the new platform will appear here."
			/>
		);
	}

	return (
		<div className="space-y-4">
			{sortedApplications.map((application) => {
				const detail = detailsById[application.id];
				const detailLoading = detailLoadingById[application.id];
				const detailError = detailErrorById[application.id];
				const expanded = expandedId === application.id;
				const actionLoading = actionLoadingById[application.id];
				const documents = detail?.documents || application.documents || [];
				const payload = detail?.payload || application.payload || {};
				const timelineItems = sortTimelineItems(detail?.timeline_items || []);
				const timelineDrafts = timelineDraftsById[application.id] || {};
				const timelineSavingKey = timelineSavingById[application.id] || "";

				return (
					<Card key={application.id} className="motion-enter-delayed">
						<div className="flex flex-col gap-4">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="space-y-1">
									<p className="text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
										Application
									</p>
									<h2 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50">
										{application.company_name}
									</h2>
									<p className="text-sm text-neutral-600 dark:text-neutral-400">
										{application.primary_email} | {application.primary_phone}
									</p>
									<p className="text-xs text-neutral-500 dark:text-neutral-400">
										Submitted {formatDate(application.submitted_at)}
									</p>
								</div>
								<StatusBadge status={application.status} />
							</div>

							<ActionButton
								type="button"
								className="w-full"
								onClick={() => {
									const nextExpanded = expanded ? "" : application.id;
									setExpandedId(nextExpanded);
									if (!expanded) {
										loadDetails(application.id);
									}
								}}
							>
								{expanded ? "Hide Review" : "Review Application"}
							</ActionButton>

							{expanded ? (
								<div className="rounded-2xl border border-(--border-soft) p-4 space-y-4 bg-neutral-50/80 dark:bg-neutral-900/30">
									{detailLoading ? (
										<p className="text-sm text-neutral-600 dark:text-neutral-400">
											Loading application details...
										</p>
									) : null}
									{detailError ? (
										<p className="text-sm font-medium text-red-600">
											{detailError}
										</p>
									) : null}

									{detail ? (
										<>
											<section className="space-y-3">
												<h3 className="font-semibold text-neutral-950 dark:text-neutral-50">
													Application Details
												</h3>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
													{PAYLOAD_FIELDS.map(([key, label]) => {
														const value = payload[key];
														if (!value) return null;
														return (
															<div
																key={key}
																className="surface-subtle rounded-xl p-3"
															>
																<p className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
																	{label}
																</p>
																<p className="mt-1 text-neutral-900 dark:text-neutral-100">
																	{String(value)}
																</p>
															</div>
														);
													})}
												</div>
											</section>

											<section className="space-y-3">
												<h3 className="font-semibold text-neutral-950 dark:text-neutral-50">
													Application Documents
												</h3>
												{documents.length ? (
													<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
														{documents.map((document) => (
															<a
																key={document.id}
																href={document.signed_url || "#"}
																target="_blank"
																rel="noreferrer"
																className="surface-subtle rounded-xl p-3 text-sm transition hover:border-(--branding-700) border border-(--border-soft)"
															>
																<p className="font-semibold text-neutral-900 dark:text-neutral-100">
																	{document.file_name}
																</p>
																<p className="text-neutral-600 dark:text-neutral-400">
																	{document.document_type}
																</p>
															</a>
														))}
													</div>
												) : (
													<p className="text-sm text-neutral-600 dark:text-neutral-400">
														No uploaded documents were found for this
														application.
													</p>
												)}
											</section>

											<section className="space-y-3">
												<h3 className="font-semibold text-neutral-950 dark:text-neutral-50">
													Review Notes
												</h3>
												<textarea
													value={notesById[application.id] || ""}
													onChange={(event) =>
														setNotesById((current) => ({
															...current,
															[application.id]: event.target.value,
														}))
													}
													rows={5}
													className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
													placeholder="Add review notes, follow-up requests, or approval context."
												/>
											</section>

											<section className="space-y-3">
												<div className="flex flex-wrap items-center justify-between gap-3">
													<h3 className="font-semibold text-neutral-950 dark:text-neutral-50">
														Applicant Timeline
													</h3>
													<p className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
														{timelineItems.length} item(s)
													</p>
												</div>
												{timelineItems.length ? (
													<div className="space-y-3">
														{timelineItems.map((item) => (
															<div
																key={item.id}
																className="surface-subtle rounded-xl p-4 space-y-2"
															>
																<div className="flex flex-wrap items-center justify-between gap-3">
																	<div>
																		<p className="font-semibold text-neutral-950 dark:text-neutral-50">
																			{item.title}
																		</p>
																		<p className="text-xs text-neutral-500 dark:text-neutral-400">
																			{capitalize(item.stage)} | {item.type}
																			{item.visible_to_tenant
																				? " | Visible to applicant"
																				: " | Internal only"}
																		</p>
																	</div>
																	<div className="flex flex-wrap gap-2">
																		<StatusBadge status={item.stage} />
																		<StatusBadge status={item.type} />
																	</div>
																</div>
																{item.description ? (
																	<p className="text-sm text-neutral-600 dark:text-neutral-400">
																		{item.description}
																	</p>
																) : null}
																<div className="flex flex-wrap gap-4 text-xs text-neutral-500 dark:text-neutral-400">
																	<span>
																		Created {formatDate(item.created_at)}
																	</span>
																	{item.due_at ? (
																		<span>Due {formatDate(item.due_at)}</span>
																	) : null}
																	{item.completed_at ? (
																		<span>
																			Completed {formatDate(item.completed_at)}
																		</span>
																	) : null}
																</div>
															</div>
														))}
													</div>
												) : (
													<p className="text-sm text-neutral-600 dark:text-neutral-400">
														No applicant-visible timeline items have been
														published yet.
													</p>
												)}
											</section>

											<section className="space-y-4">
												<div className="space-y-1">
													<h3 className="font-semibold text-neutral-950 dark:text-neutral-50">
														Next-Step Controls
													</h3>
													<p className="text-sm text-neutral-600 dark:text-neutral-400">
														Publish or update the applicant-facing next steps
														after approval. Each save updates the tenant
														timeline immediately.
													</p>
												</div>
												<div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
													{TIMELINE_CONTROL_ITEMS.map((itemKey) => {
														const draft = timelineDrafts[itemKey] || {
															stage: "upcoming",
															description:
																TIMELINE_DESCRIPTION_DEFAULTS[itemKey] || "",
															sendUpdateEmail: false,
														};
														const definition =
															JOURNEY_ITEM_DEFINITIONS[itemKey];
														const currentItem = timelineItems.find(
															(item) => item.item_key === itemKey,
														);

														return (
															<div
																key={itemKey}
																className="rounded-2xl border border-(--border-soft) bg-white/90 p-4 space-y-3 dark:bg-neutral-950/50"
															>
																<div className="space-y-1">
																	<div className="flex flex-wrap items-center justify-between gap-2">
																		<p className="font-semibold text-neutral-950 dark:text-neutral-50">
																			{definition.title}
																		</p>
																		<StatusBadge
																			status={currentItem?.stage || draft.stage}
																		/>
																	</div>
																</div>

																<select
																	value={draft.stage}
																	onChange={(event) =>
																		updateTimelineDraft(
																			application.id,
																			itemKey,
																			{
																				stage: event.target.value,
																			},
																		)
																	}
																	className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
																>
																	{TIMELINE_STAGE_VALUES.map((stage) => (
																		<option key={stage} value={stage}>
																			{capitalize(stage)}
																		</option>
																	))}
																</select>

																<textarea
																	value={draft.description}
																	onChange={(event) =>
																		updateTimelineDraft(
																			application.id,
																			itemKey,
																			{
																				description: event.target.value,
																			},
																		)
																	}
																	rows={4}
																	className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
																/>

																<label className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300">
																	<input
																		type="checkbox"
																		checked={Boolean(draft.sendUpdateEmail)}
																		onChange={(event) =>
																			updateTimelineDraft(
																				application.id,
																				itemKey,
																				{
																					sendUpdateEmail: event.target.checked,
																				},
																			)
																		}
																		className="h-4 w-4 rounded border-(--border-soft)"
																	/>
																	Send timeline update email
																</label>

																<ActionButton
																	type="button"
																	className="w-full"
																	tone="primary"
																	disabled={Boolean(timelineSavingKey)}
																	onClick={() =>
																		submitTimelineUpdate(
																			application.id,
																			itemKey,
																		)
																	}
																>
																	{timelineSavingKey === itemKey
																		? "Saving Timeline Step..."
																		: "Save Timeline Step"}
																</ActionButton>
															</div>
														);
													})}
												</div>
												{timelineSuccessById[application.id] ? (
													<p className="text-sm font-medium text-emerald-600">
														{timelineSuccessById[application.id]}
													</p>
												) : null}
												{timelineErrorById[application.id] ? (
													<p className="text-sm font-medium text-red-600">
														{timelineErrorById[application.id]}
													</p>
												) : null}
											</section>

											<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
												<ActionButton
													type="button"
													tone="primary"
													disabled={Boolean(actionLoading)}
													onClick={() => submitAction(application.id, "review")}
												>
													Mark In Review
												</ActionButton>
												<ActionButton
													type="button"
													tone="neutral"
													disabled={Boolean(actionLoading)}
													onClick={() =>
														submitAction(application.id, "request_info")
													}
												>
													Request Feedback
												</ActionButton>
												<ActionButton
													type="button"
													tone="positive"
													disabled={Boolean(actionLoading)}
													onClick={() =>
														submitAction(application.id, "approve")
													}
												>
													Approve Application
												</ActionButton>
												<ActionButton
													type="button"
													tone="danger"
													disabled={Boolean(actionLoading)}
													onClick={() => submitAction(application.id, "deny")}
												>
													Close Application
												</ActionButton>
											</div>

											{actionLoading ? (
												<p className="text-sm text-neutral-600 dark:text-neutral-400">
													Saving review decision...
												</p>
											) : null}
											{actionErrorById[application.id] ? (
												<p className="text-sm font-medium text-red-600">
													{actionErrorById[application.id]}
												</p>
											) : null}
										</>
									) : null}
								</div>
							) : null}
						</div>
					</Card>
				);
			})}
		</div>
	);
}
