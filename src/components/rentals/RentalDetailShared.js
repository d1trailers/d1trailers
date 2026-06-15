import {
	ArrowPathIcon,
	DocumentTextIcon,
	XCircleIcon,
} from "@heroicons/react/24/outline";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/admin/StatusBadge";

export function formatRentalDate(value, options) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return options
		? date.toLocaleDateString(undefined, options)
		: date.toLocaleDateString();
}

export function formatRentalDateTime(value, options) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString(undefined, options);
}

export function formatRentalCurrency(value) {
	const numericValue = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(numericValue)) return "-";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 2,
	}).format(numericValue);
}

export function formatRentalLabel(value) {
	if (!value) return "Unknown";
	return String(value)
		.split("_")
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(" ");
}

export function getRentalRecordTitle(rental) {
	if (!rental) return "Rental";
	if (rental.status === "customer_review") {
		return "Rental Proposal";
	}
	if (rental.status === "changes_pending") {
		return "Changes Requested";
	}
	if (rental.requestKind === "rental_expansion") {
		return "Trailer Request";
	}
	if (rental.recordKind === "request") {
		return "Rental Draft";
	}
	return "Rental Agreement";
}

export function EmptyDetailState({ title, message }) {
	return (
		<div className="rounded-2xl border border-dashed border-(--border-soft) bg-white/70 p-4 text-sm text-neutral-600 dark:bg-neutral-950/40 dark:text-neutral-400">
			<p className="font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>
			<p className="mt-2">{message}</p>
		</div>
	);
}

export function RentalMetricTile({ label, value, hint }) {
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

export function RentalHeaderCard({
	rental,
	pendingBadge = null,
	tenantName,
	createdAt,
	parentRentalId,
}) {
	if (!rental && !tenantName) return null;

	return (
		<Card>
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="space-y-2">
					<p className="font-semibold text-neutral-950 dark:text-neutral-50">
						{tenantName || rental?.tenantName || "Unknown tenant"}
					</p>
					<p className="text-sm text-neutral-600 dark:text-neutral-400">
						Created {formatRentalDate(createdAt || rental?.createdAt)}
						{parentRentalId || rental?.parentRentalId ? " | Linked to existing rental" : ""}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					{pendingBadge}
					{rental?.recordKind ? <StatusBadge status={rental.recordKind} /> : null}
					{rental?.status ? <StatusBadge status={rental.status} /> : null}
					{rental?.billingStatus ? <StatusBadge status={rental.billingStatus} /> : null}
				</div>
			</div>
		</Card>
	);
}

export function RentalAssignmentsCard({
	assignments = [],
	title = "Assignments",
	emptyTitle = "No Assignments",
	emptyMessage = "No trailer assignments are attached to this rental.",
	onRemoveAssignment = null,
	removingAssignmentId = "",
}) {
	return (
		<Card>
			<div className="space-y-3">
				<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
					{title}
				</h3>
				{assignments.length ? (
					<div className="space-y-3">
						{assignments.map((assignment) => (
							<div key={assignment.id} className="surface-subtle rounded-2xl p-4">
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div>
										<p className="font-semibold text-neutral-950 dark:text-neutral-50">
											{assignment.trailer?.trailerCode ||
												assignment.trailer?.vin ||
												assignment.trailerId}
										</p>
										<p className="text-sm text-neutral-600 dark:text-neutral-400">
											{assignment.trailer?.trailerType || "Trailer"} |{" "}
											{formatRentalDate(assignment.startDate)} to{" "}
											{formatRentalDate(assignment.endDate)}
										</p>
									</div>
									<div className="flex flex-wrap items-center gap-2">
										<StatusBadge status={assignment.status} />
										{typeof onRemoveAssignment === "function" &&
										assignment.status === "active" ? (
											<button
												type="button"
												onClick={() => onRemoveAssignment(assignment.id)}
												disabled={removingAssignmentId === assignment.id}
												className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white/90 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-red-900/40 dark:bg-neutral-950/70 dark:text-red-300"
											>
												{removingAssignmentId === assignment.id ? (
													<ArrowPathIcon
														className="h-4 w-4 animate-spin"
														aria-hidden="true"
													/>
												) : (
													<XCircleIcon className="h-4 w-4" aria-hidden="true" />
												)}
												Unassign
											</button>
										) : null}
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<EmptyDetailState title={emptyTitle} message={emptyMessage} />
				)}
			</div>
		</Card>
	);
}

export function RentalDocumentsCard({
	title = "Documents",
	documents = [],
	emptyTitle = "No Documents",
	emptyMessage = "No documents are attached to this rental.",
	action = null,
}) {
	return (
		<Card>
			<div className="space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
						{title}
					</h3>
					{action}
				</div>
				{documents.length ? (
					<div className="space-y-3">
						{documents.map((document) => {
							const Wrapper = document.signedUrl ? "a" : "div";
							return (
								<Wrapper
									key={document.id}
									{...(document.signedUrl
										? {
												href: document.signedUrl,
												target: "_blank",
												rel: "noreferrer",
											}
										: {})}
									className="surface-subtle flex items-start gap-3 rounded-2xl p-4 transition hover:border hover:border-(--branding-700)"
								>
									<DocumentTextIcon
										className="mt-0.5 h-5 w-5 text-(--branding-700)"
										aria-hidden="true"
									/>
									<div className="space-y-1">
										<p className="font-semibold text-neutral-950 dark:text-neutral-50">
											{document.fileName}
										</p>
										<p className="text-sm text-neutral-600 dark:text-neutral-400">
											{document.documentType}
										</p>
										<p className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
											{document.source === "rental"
												? "Rental Document"
												: "Application Document"}
											{document.category ? ` | ${document.category}` : ""}
										</p>
									</div>
								</Wrapper>
							);
						})}
					</div>
				) : (
					<EmptyDetailState title={emptyTitle} message={emptyMessage} />
				)}
			</div>
		</Card>
	);
}
