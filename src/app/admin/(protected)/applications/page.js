"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import StateCard from "@/components/admin/StateCard";
import StatusBadge from "@/components/admin/StatusBadge";
import { LoadingCardGrid, LoadingPanel } from "@/components/ui/LoadingSkeleton";

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

function formatDate(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString();
}

function ActionButton({ children, tone = "primary", className = "", ...props }) {
	const tones = {
		primary: "bg-(--branding-700) text-neutral-50 hover:bg-(--branding-800)",
		positive: "bg-emerald-600 text-white hover:bg-emerald-700",
		neutral: "border border-(--border-soft) text-neutral-800 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-900",
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

export default function AdminApplicationsPage() {
	const [applications, setApplications] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [expandedId, setExpandedId] = useState("");
	const [detailsById, setDetailsById] = useState({});
	const [detailLoadingById, setDetailLoadingById] = useState({});
	const [detailErrorById, setDetailErrorById] = useState({});
	const [notesById, setNotesById] = useState({});
	const [actionLoadingById, setActionLoadingById] = useState({});
	const [actionErrorById, setActionErrorById] = useState({});

	async function loadApplications() {
		try {
			const res = await fetch("/api/admin/applications");
			const json = await res.json().catch(() => []);

			if (!res.ok) {
				setError(typeof json?.error === "string" ? json.error : "Failed to load applications.");
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
		let active = true;

		async function initialize() {
			try {
				const res = await fetch("/api/admin/applications");
				const json = await res.json().catch(() => []);

				if (!active) return;

				if (!res.ok) {
					setError(typeof json?.error === "string" ? json.error : "Failed to load applications.");
					setLoading(false);
					return;
				}

				setApplications(Array.isArray(json) ? json : []);
				setError("");
				setLoading(false);
			} catch {
				if (!active) return;
				setError("Failed to load applications.");
				setLoading(false);
			}
		}

		void initialize();
		return () => {
			active = false;
		};
	}, []);

	async function loadDetails(applicationId) {
		if (!applicationId || detailsById[applicationId] || detailLoadingById[applicationId]) return;

		setDetailLoadingById((current) => ({ ...current, [applicationId]: true }));
		setDetailErrorById((current) => ({ ...current, [applicationId]: "" }));

		try {
			const res = await fetch(`/api/admin/applications/${encodeURIComponent(applicationId)}`);
			const json = await res.json().catch(() => ({}));

			if (!res.ok) {
				setDetailErrorById((current) => ({
					...current,
					[applicationId]: typeof json?.error === "string" ? json.error : "Failed to load application details.",
				}));
				setDetailLoadingById((current) => ({ ...current, [applicationId]: false }));
				return;
			}

			setDetailsById((current) => ({ ...current, [applicationId]: json }));
			setNotesById((current) => ({ ...current, [applicationId]: json.review_notes || "" }));
			setDetailLoadingById((current) => ({ ...current, [applicationId]: false }));
		} catch {
			setDetailErrorById((current) => ({ ...current, [applicationId]: "Failed to load application details." }));
			setDetailLoadingById((current) => ({ ...current, [applicationId]: false }));
		}
	}

	async function submitAction(applicationId, action) {
		setActionLoadingById((current) => ({ ...current, [applicationId]: action }));
		setActionErrorById((current) => ({ ...current, [applicationId]: "" }));

		try {
			const res = await fetch(`/api/admin/applications/${encodeURIComponent(applicationId)}/decision`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action, reviewNotes: notesById[applicationId] || "" }),
			});
			const json = await res.json().catch(() => ({}));

			if (!res.ok) {
				setActionErrorById((current) => ({
					...current,
					[applicationId]: typeof json?.error === "string" ? json.error : "Failed to update application.",
				}));
				setActionLoadingById((current) => ({ ...current, [applicationId]: "" }));
				return;
			}

			setActionLoadingById((current) => ({ ...current, [applicationId]: "" }));
			await Promise.all([loadApplications(), loadDetails(applicationId)]);
		} catch {
			setActionErrorById((current) => ({ ...current, [applicationId]: "Failed to update application." }));
			setActionLoadingById((current) => ({ ...current, [applicationId]: "" }));
		}
	}

	const sortedApplications = useMemo(() => applications, [applications]);

	if (loading) {
		return (
			<div className="space-y-4">
				<LoadingPanel title="Loading Applications" subtitle="Fetching applicant records from the new tenant platform." />
				<LoadingCardGrid count={4} />
			</div>
		);
	}

	if (error) {
		return <StateCard title="Applications Unavailable" message={error} tone="error" />;
	}

	if (!sortedApplications.length) {
		return <StateCard title="No Applications Yet" message="Applications submitted through the new platform will appear here." />;
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

				return (
					<Card key={application.id} className="motion-enter-delayed">
						<div className="flex flex-col gap-4">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="space-y-1">
									<p className="text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Application</p>
									<h2 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50">{application.company_name}</h2>
									<p className="text-sm text-neutral-600 dark:text-neutral-400">{application.primary_email} | {application.primary_phone}</p>
									<p className="text-xs text-neutral-500 dark:text-neutral-400">Submitted {formatDate(application.submitted_at)}</p>
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
									{detailLoading ? <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading application details...</p> : null}
									{detailError ? <p className="text-sm font-medium text-red-600">{detailError}</p> : null}

									{detail ? (
										<>
											<section className="space-y-3">
												<h3 className="font-semibold text-neutral-950 dark:text-neutral-50">Application Details</h3>
												<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
													{PAYLOAD_FIELDS.map(([key, label]) => {
														const value = payload[key];
														if (!value) return null;
														return (
															<div key={key} className="surface-subtle rounded-xl p-3">
																<p className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">{label}</p>
																<p className="mt-1 text-neutral-900 dark:text-neutral-100">{String(value)}</p>
															</div>
														);
													})}
												</div>
											</section>

											<section className="space-y-3">
												<h3 className="font-semibold text-neutral-950 dark:text-neutral-50">Application Documents</h3>
												{documents.length ? (
													<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
														{documents.map((document) => (
															<a key={document.id} href={document.signed_url || "#"} target="_blank" rel="noreferrer" className="surface-subtle rounded-xl p-3 text-sm transition hover:border-(--branding-700) border border-(--border-soft)">
																<p className="font-semibold text-neutral-900 dark:text-neutral-100">{document.file_name}</p>
																<p className="text-neutral-600 dark:text-neutral-400">{document.document_type}</p>
															</a>
														))}
													</div>
												) : (
													<p className="text-sm text-neutral-600 dark:text-neutral-400">No uploaded documents were found for this application.</p>
												)}
											</section>

											<section className="space-y-3">
												<h3 className="font-semibold text-neutral-950 dark:text-neutral-50">Review Notes</h3>
												<textarea
													value={notesById[application.id] || ""}
													onChange={(event) => setNotesById((current) => ({ ...current, [application.id]: event.target.value }))}
													rows={5}
													className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
													placeholder="Add review notes, follow-up requests, or approval context."
												/>
											</section>

											<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
												<ActionButton type="button" tone="primary" disabled={Boolean(actionLoading)} onClick={() => submitAction(application.id, "review")}>Mark In Review</ActionButton>
												<ActionButton type="button" tone="neutral" disabled={Boolean(actionLoading)} onClick={() => submitAction(application.id, "request_info")}>Request Feedback</ActionButton>
												<ActionButton type="button" tone="positive" disabled={Boolean(actionLoading)} onClick={() => submitAction(application.id, "approve")}>Approve Application</ActionButton>
												<ActionButton type="button" tone="danger" disabled={Boolean(actionLoading)} onClick={() => submitAction(application.id, "deny")}>Close Application</ActionButton>
											</div>

											{actionLoading ? <p className="text-sm text-neutral-600 dark:text-neutral-400">Saving review decision...</p> : null}
											{actionErrorById[application.id] ? <p className="text-sm font-medium text-red-600">{actionErrorById[application.id]}</p> : null}
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
