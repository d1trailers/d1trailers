"use client";

import Link from "next/link";
import {
	BanknotesIcon,
	ChatBubbleLeftRightIcon,
	ClipboardDocumentListIcon,
	ClockIcon,
	DocumentTextIcon,
	EnvelopeIcon,
	FolderOpenIcon,
	SparklesIcon,
} from "@heroicons/react/24/outline";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/admin/StatusBadge";
import {
	JOURNEY_ITEM_KEYS,
	TIMELINE_STAGE_VALUES,
} from "@/lib/contracts/journey";

const TAB_ITEMS = [
	{ id: "communications", label: "Communications", icon: ChatBubbleLeftRightIcon },
	{ id: "status", label: "Status", icon: SparklesIcon },
	{ id: "billing", label: "Billing", icon: BanknotesIcon },
	{ id: "documents", label: "Documents", icon: FolderOpenIcon },
];

const TIMELINE_ACTIONS = {
	timeline_sign_documents: {
		itemKey: JOURNEY_ITEM_KEYS.signDocuments,
		label: "Publish: Sign Documents",
		subjectLine: "Sign your rental documents",
		description:
			"Review and sign the required rental documents so your trailer can be released.",
	},
	timeline_review_contract: {
		itemKey: JOURNEY_ITEM_KEYS.reviewContract,
		label: "Publish: Review Contract",
		subjectLine: "Review your contract details",
		description:
			"Review your rental contract details once the document packet is ready.",
	},
	timeline_pick_up_trailer: {
		itemKey: JOURNEY_ITEM_KEYS.pickUpTrailer,
		label: "Publish: Pick Up Trailer",
		subjectLine: "Coordinate trailer pickup",
		description:
			"Coordinate pickup details once your documents and contract steps are complete.",
	},
};

function formatDate(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString();
}

function formatLabel(value) {
	if (!value) return "Unknown";
	return value
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
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
			className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]} ${className}`}
		>
			{children}
		</button>
	);
}

function MetricTile({ label, value, hint }) {
	return (
		<div className="surface-subtle rounded-2xl p-4">
			<p className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
				{label}
			</p>
			<p className="mt-2 font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
				{value}
			</p>
			{hint ? (
				<p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{hint}</p>
			) : null}
		</div>
	);
}

function EmptyTabState({ title, message }) {
	return (
		<div className="rounded-2xl border border-dashed border-(--border-soft) bg-white/70 p-6 text-sm text-neutral-600 dark:bg-neutral-950/30 dark:text-neutral-400">
			<p className="font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>
			<p className="mt-2">{message}</p>
		</div>
	);
}

function TimelineHistory({ items }) {
	if (!items.length) {
		return (
			<EmptyTabState
				title="No Timeline Published"
				message="Applicant-facing timeline items will appear here after communication or workflow updates are published."
			/>
		);
	}

	return (
		<div className="space-y-3">
			{items.map((item) => (
				<div key={item.id} className="surface-subtle rounded-2xl p-4 space-y-2">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p className="font-semibold text-neutral-950 dark:text-neutral-50">
								{item.title}
							</p>
							<p className="text-xs text-neutral-500 dark:text-neutral-400">
								{formatLabel(item.stage)} | {formatLabel(item.type)}
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<StatusBadge status={item.stage} />
							<StatusBadge status={item.type} />
						</div>
					</div>
					{item.description ? (
						<p className="text-sm text-neutral-600 dark:text-neutral-400">{item.description}</p>
					) : null}
					<div className="flex flex-wrap gap-4 text-xs text-neutral-500 dark:text-neutral-400">
						<span>Created {formatDate(item.created_at)}</span>
						{item.completed_at ? <span>Completed {formatDate(item.completed_at)}</span> : null}
						{item.due_at ? <span>Due {formatDate(item.due_at)}</span> : null}
					</div>
				</div>
			))}
		</div>
	);
}

function CommunicationsTab({
	detail,
	draft,
	onDraftChange,
	onSubmit,
	submitting,
	error,
	success,
}) {
	const currentApplication = detail.currentApplication;
	const timelineAction = draft.actionKey.startsWith("timeline_")
		? TIMELINE_ACTIONS[draft.actionKey]
		: null;
	const communicationOptions = [
		{ value: "general_update", label: "General Account Update" },
		...Object.entries(TIMELINE_ACTIONS).map(([value, config]) => ({
			value,
			label: config.label,
		})),
	];

	return (
		<div className="space-y-4">
			<Card>
				<div className="space-y-4">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div>
							<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
								Send Update
							</h3>
							<p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
								Choose a communication type, refine the message, and send it from one place.
							</p>
						</div>
						<div className="rounded-2xl border border-(--border-soft) bg-white/80 px-4 py-3 text-sm text-neutral-600 dark:bg-neutral-950/40 dark:text-neutral-300">
							<p className="font-semibold text-neutral-900 dark:text-neutral-100">
								Recipient
							</p>
							<p>{detail.tenant.primary_email}</p>
						</div>
					</div>

					<div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
						<div className="space-y-3">
							<label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
								Update Type
							</label>
							<select
								value={draft.actionKey}
								onChange={(event) =>
									onDraftChange({ actionKey: event.target.value })
								}
								className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
							>
								{communicationOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>

							<label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
								Subject
							</label>
							<input
								type="text"
								value={draft.subjectLine}
								onChange={(event) => onDraftChange({ subjectLine: event.target.value })}
								className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
								placeholder="Short update subject"
							/>

							{timelineAction ? (
								<>
									<label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
										Timeline Stage
									</label>
									<select
										value={draft.stage}
										onChange={(event) => onDraftChange({ stage: event.target.value })}
										className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
									>
										{TIMELINE_STAGE_VALUES.map((stage) => (
											<option key={stage} value={stage}>
												{formatLabel(stage)}
											</option>
										))}
									</select>

									<label className="flex items-center gap-3 rounded-xl border border-(--border-soft) px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
										<input
											type="checkbox"
											checked={Boolean(draft.sendEmail)}
											onChange={(event) => onDraftChange({ sendEmail: event.target.checked })}
											className="h-4 w-4 rounded border-(--border-soft)"
										/>
										Email applicant when this timeline step is published
									</label>
								</>
							) : null}
						</div>

						<div className="space-y-3">
							<label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
								Message
							</label>
							<textarea
								value={draft.message}
								onChange={(event) => onDraftChange({ message: event.target.value })}
								rows={9}
								className="w-full rounded-2xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
								placeholder="Share the update that should go to the tenant."
							/>
							<div className="flex flex-wrap items-center justify-between gap-3">
								<p className="text-xs text-neutral-500 dark:text-neutral-400">
									{timelineAction
										? "This will publish the selected timeline step and optionally email the applicant."
										: "This will send a direct account update without changing tenant workflow state."}
								</p>
								<ActionButton
									type="button"
									tone="primary"
									onClick={onSubmit}
									disabled={submitting || (timelineAction && !currentApplication)}
								>
									{submitting ? "Sending Update..." : "Send Update"}
								</ActionButton>
							</div>
							{timelineAction && !currentApplication ? (
								<p className="text-sm font-medium text-amber-600">
									A submitted application is required before timeline steps can be published.
								</p>
							) : null}
							{success ? <p className="text-sm font-medium text-emerald-600">{success}</p> : null}
							{error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
						</div>
					</div>
				</div>
			</Card>

			<Card>
				<div className="space-y-3">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
							Recent Communications
						</h3>
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							{detail.communications.length} event(s)
						</p>
					</div>
					{detail.communications.length ? (
						<div className="space-y-3">
							{detail.communications.map((communication) => (
								<div key={communication.id} className="surface-subtle rounded-2xl p-4 space-y-2">
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<p className="font-semibold text-neutral-950 dark:text-neutral-50">
												{communication.subject || formatLabel(communication.type)}
											</p>
											<p className="text-sm text-neutral-600 dark:text-neutral-400">
												{communication.recipient_email}
											</p>
										</div>
										<div className="flex flex-wrap gap-2">
											<StatusBadge status={communication.type} />
											<StatusBadge status={communication.status} />
										</div>
									</div>
									<div className="flex flex-wrap gap-4 text-xs text-neutral-500 dark:text-neutral-400">
										<span>Created {formatDate(communication.created_at)}</span>
										{communication.sent_at ? <span>Sent {formatDate(communication.sent_at)}</span> : null}
									</div>
								</div>
							))}
						</div>
					) : (
						<EmptyTabState
							title="No Communication History"
							message="Messages, timeline update emails, and workflow notifications will appear here."
						/>
					)}
				</div>
			</Card>
		</div>
	);
}

function StatusTab({
	detail,
	notes,
	onNotesChange,
	onSubmitAction,
	actionLoading,
	actionError,
}) {
	const currentApplication = detail.currentApplication;
	const timelineItems = currentApplication?.timeline_items || [];

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
				<MetricTile label="Tenant Status" value={formatLabel(detail.tenant.status)} hint="Account-level lifecycle state." />
				<MetricTile
					label="Application Status"
					value={currentApplication ? formatLabel(currentApplication.status) : "None"}
					hint="Latest submitted application record."
				/>
				<MetricTile label="Applications" value={detail.applications.length} hint="Total application records on this account." />
				<MetricTile label="Rentals" value={detail.rentals.length} hint="Current rental records tied to this tenant." />
			</div>

			<Card>
				<div className="space-y-4">
					<div>
						<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
							Workflow Controls
						</h3>
						<p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
							Use the account workflow controls here, while keeping communication-specific updates in the Communications tab.
						</p>
					</div>

					{currentApplication ? (
						<>
							<textarea
								value={notes}
								onChange={(event) => onNotesChange(event.target.value)}
								rows={6}
								className="w-full rounded-2xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
								placeholder="Keep review notes, follow-up context, or approval rationale here."
							/>
							<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
								<ActionButton type="button" tone="primary" disabled={Boolean(actionLoading)} onClick={() => onSubmitAction("review")}>
									Mark In Review
								</ActionButton>
								<ActionButton type="button" tone="neutral" disabled={Boolean(actionLoading)} onClick={() => onSubmitAction("request_info")}>
									Request Feedback
								</ActionButton>
								<ActionButton type="button" tone="positive" disabled={Boolean(actionLoading)} onClick={() => onSubmitAction("approve")}>
									Approve Application
								</ActionButton>
								<ActionButton type="button" tone="danger" disabled={Boolean(actionLoading)} onClick={() => onSubmitAction("deny")}>
									Close Application
								</ActionButton>
							</div>
							{actionLoading ? (
								<p className="text-sm text-neutral-600 dark:text-neutral-400">Saving workflow update...</p>
							) : null}
							{actionError ? <p className="text-sm font-medium text-red-600">{actionError}</p> : null}
						</>
					) : (
						<EmptyTabState
							title="No Submitted Application"
							message="This tenant has not submitted a full application yet, so review workflow actions are not available."
						/>
					)}
				</div>
			</Card>

			<Card>
				<div className="space-y-3">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
							Applicant Timeline
						</h3>
						<p className="text-sm text-neutral-600 dark:text-neutral-400">{timelineItems.length} item(s)</p>
					</div>
					<TimelineHistory items={timelineItems} />
				</div>
			</Card>
		</div>
	);
}

function BillingTab({ detail }) {
	const currentApplication = detail.currentApplication;
	const approvedState = ["approved", "awaiting_first_payment", "active", "past_due", "suspended"].includes(detail.tenant.status);

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
				<MetricTile label="Account Status" value={formatLabel(detail.tenant.status)} hint="Top-level tenant billing visibility." />
				<MetricTile label="Billing Frequency" value={currentApplication?.billing_frequency ? formatLabel(currentApplication.billing_frequency) : "Monthly"} hint="Current application billing preference." />
				<MetricTile label="Rental Count" value={detail.rentals.length} hint="Rental-linked billing records will surface here as operations come online." />
			</div>

			<Card>
				<div className="space-y-3">
					<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
						Billing Snapshot
					</h3>
					{approvedState ? (
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							This account is in or near operational billing stages. Stripe-backed billing controls will continue to expand here, but this pane already keeps billing-specific information separate from workflow status.
						</p>
					) : (
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							Billing is not active for this tenant yet. Once the account reaches approval and activation stages, billing actions and account health will surface here.
						</p>
					)}
				</div>
			</Card>

			{detail.rentals.length ? (
				<Card>
					<div className="space-y-3">
						<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
							Rental References
						</h3>
						<div className="space-y-3">
							{detail.rentals.map((rental) => (
								<div key={rental.id} className="surface-subtle rounded-2xl p-4">
									<div className="flex flex-wrap items-center justify-between gap-3">
										<div>
											<p className="font-semibold text-neutral-950 dark:text-neutral-50">
												{rental.rental_number || rental.id}
											</p>
											<p className="text-sm text-neutral-600 dark:text-neutral-400">
												Created {formatDate(rental.created_at)}
											</p>
										</div>
										<StatusBadge status={rental.status || "pending"} />
									</div>
								</div>
							))}
						</div>
					</div>
				</Card>
			) : null}
		</div>
	);
}

function DocumentsTab({ detail }) {
	const documentGroups = detail.applications
		.map((application) => ({
			application,
			documents: application.documents || [],
		}))
		.filter((group) => group.documents.length);

	return (
		<div className="space-y-4">
			<Card>
				<div className="space-y-3">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
							Application Documents
						</h3>
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							{documentGroups.reduce((count, group) => count + group.documents.length, 0)} document(s)
						</p>
					</div>
					{documentGroups.length ? (
						<div className="space-y-4">
							{documentGroups.map((group) => (
								<div key={group.application.id} className="space-y-3">
									<div className="flex flex-wrap items-center justify-between gap-3">
										<div>
											<p className="font-semibold text-neutral-950 dark:text-neutral-50">
												{group.application.company_name}
											</p>
											<p className="text-sm text-neutral-600 dark:text-neutral-400">
												Submitted {formatDate(group.application.submitted_at)}
											</p>
										</div>
										<StatusBadge status={group.application.status} />
									</div>
									<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
										{group.documents.map((document) => (
											<Link
												key={document.id}
												href={document.signed_url || "#"}
												target="_blank"
												rel="noreferrer"
												className="surface-subtle rounded-2xl border border-(--border-soft) p-4 transition hover:border-(--branding-700)"
											>
												<div className="flex items-start gap-3">
													<DocumentTextIcon className="mt-0.5 h-5 w-5 text-(--branding-700)" aria-hidden="true" />
													<div>
														<p className="font-semibold text-neutral-950 dark:text-neutral-50">
															{document.file_name}
														</p>
														<p className="text-sm text-neutral-600 dark:text-neutral-400">
															{document.document_type}
														</p>
													</div>
												</div>
											</Link>
										))}
									</div>
								</div>
							))}
						</div>
					) : (
						<EmptyTabState
							title="No Documents Uploaded"
							message="Uploaded application documents will appear here once the tenant submits them."
						/>
					)}
				</div>
			</Card>
		</div>
	);
}

export default function TenantManagementPane({
	detail,
	loading,
	error,
	activeTab,
	onTabChange,
	notes,
	onNotesChange,
	onSubmitAction,
	actionLoading,
	actionError,
	communicationDraft,
	onCommunicationDraftChange,
	onCommunicationSubmit,
	communicationSubmitting,
	communicationError,
	communicationSuccess,
}) {
	if (loading) {
		return (
			<Card>
				<div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
					<p className="font-semibold text-neutral-900 dark:text-neutral-100">
						Loading tenant management pane...
					</p>
					<p>Fetching tenant details, applications, timeline, and communications.</p>
				</div>
			</Card>
		);
	}

	if (error) {
		return <EmptyTabState title="Tenant Unavailable" message={error} />;
	}

	if (!detail) {
		return (
			<EmptyTabState
				title="Select a Tenant"
				message="Choose a tenant from the management list to open the shared workflow pane."
			/>
		);
	}

	const currentApplication = detail.currentApplication;
	const metrics = [
		{ label: "Tenant Status", value: formatLabel(detail.tenant.status), hint: "Top-level account lifecycle state." },
		{ label: "Application", value: currentApplication ? formatLabel(currentApplication.status) : "None", hint: currentApplication ? `Submitted ${formatDate(currentApplication.submitted_at)}` : "No submitted application yet." },
		{ label: "Communications", value: detail.communications.length, hint: "Recorded outbound events." },
		{ label: "Pending Actions", value: detail.timelineItems.filter((item) => item.visible_to_tenant && item.stage !== "completed" && item.type === "action_required").length, hint: "Open tenant-facing action items." },
	];

	return (
		<div className="space-y-4">
			<Card className="gap-4">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="space-y-2">
						<p className="text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
							Tenant Management
						</p>
						<h2 className="font-syne text-3xl font-bold text-neutral-950 dark:text-neutral-50">
							{detail.tenant.display_name}
						</h2>
						<div className="flex flex-wrap gap-2 text-sm text-neutral-600 dark:text-neutral-400">
							<span className="inline-flex items-center gap-2"><EnvelopeIcon className="h-4 w-4" aria-hidden="true" /> {detail.tenant.primary_email}</span>
							{detail.tenant.primary_phone ? <span>{detail.tenant.primary_phone}</span> : null}
							<span className="inline-flex items-center gap-2"><ClockIcon className="h-4 w-4" aria-hidden="true" /> Updated {formatDate(detail.tenant.updated_at)}</span>
						</div>
					</div>
					<div className="flex flex-wrap gap-2">
						<StatusBadge status={detail.tenant.status} />
						{currentApplication ? <StatusBadge status={currentApplication.status} /> : null}
					</div>
				</div>

				<div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
					{metrics.map((metric) => (
						<MetricTile key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} />
					))}
				</div>
			</Card>

			<div className="flex flex-wrap gap-2">
				{TAB_ITEMS.map((tab) => {
					const Icon = tab.icon;
					const active = tab.id === activeTab;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => onTabChange(tab.id)}
							className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-(--branding-700) text-neutral-50" : "surface-subtle text-neutral-800 dark:text-neutral-100"}`}
						>
							<Icon className="h-5 w-5" aria-hidden="true" />
							{tab.label}
						</button>
					);
				})}
			</div>

			{activeTab === "communications" ? (
				<CommunicationsTab
					detail={detail}
					draft={communicationDraft}
					onDraftChange={onCommunicationDraftChange}
					onSubmit={onCommunicationSubmit}
					submitting={communicationSubmitting}
					error={communicationError}
					success={communicationSuccess}
				/>
			) : null}
			{activeTab === "status" ? (
				<StatusTab
					detail={detail}
					notes={notes}
					onNotesChange={onNotesChange}
					onSubmitAction={onSubmitAction}
					actionLoading={actionLoading}
					actionError={actionError}
				/>
			) : null}
			{activeTab === "billing" ? <BillingTab detail={detail} /> : null}
			{activeTab === "documents" ? <DocumentsTab detail={detail} /> : null}
		</div>
	);
}
