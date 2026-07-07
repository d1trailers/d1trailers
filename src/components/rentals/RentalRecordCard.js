"use client";

import StatusBadge from "@/components/admin/StatusBadge";
import { buildRentalTrailerTypeSummary } from "@/lib/trailerTypes";

function formatDate(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleDateString();
}

function getRentalTitle(rental) {
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

export default function RentalRecordCard({
	rental,
	onClick,
	title,
	subtitle,
	meta,
	showTenantName = false,
	pendingBadge = null,
	showTrailerTypeSummary = false,
}) {
	const resolvedTitle = title || (showTenantName ? rental.tenantName || "Unknown tenant" : getRentalTitle(rental));
	const resolvedMeta =
		meta ||
		(rental.contractStartDate
			? `${formatDate(rental.contractStartDate)} to ${formatDate(rental.endDate)}`
			: "Dates pending");
	const trailerTypeSummary = buildRentalTrailerTypeSummary(rental);

	return (
		<button
			type="button"
			onClick={() => onClick(rental.id)}
			className="w-full rounded-2xl border border-(--border-soft) bg-white/80 p-4 text-left transition hover:border-(--branding-700) hover:bg-white dark:bg-neutral-950/60"
		>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="font-semibold text-neutral-950 dark:text-neutral-50">
						{resolvedTitle}
					</p>
					{subtitle ? (
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							{subtitle}
						</p>
					) : null}
					<p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
						{resolvedMeta}
					</p>
				</div>
				<div className="flex flex-wrap justify-end gap-2">
					{showTrailerTypeSummary ? (
						trailerTypeSummary.length ? (
							trailerTypeSummary.map((item) => (
								<span
									key={`${item.label}-${item.count}`}
									className="rounded-full border border-(--border-soft) bg-white px-3 py-1 text-xs font-semibold text-neutral-700 shadow-sm dark:bg-neutral-950 dark:text-neutral-200"
								>
									{item.label} x {item.count}
								</span>
							))
						) : (
							<span className="rounded-full border border-dashed border-(--border-soft) px-3 py-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
								Trailer type pending
							</span>
						)
					) : (
						<>
							{pendingBadge}
							<StatusBadge status={rental.status} />
							{rental.billingStatus ? <StatusBadge status={rental.billingStatus} /> : null}
						</>
					)}
				</div>
			</div>
		</button>
	);
}
