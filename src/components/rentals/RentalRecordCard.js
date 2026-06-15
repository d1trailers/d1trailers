"use client";

import StatusBadge from "@/components/admin/StatusBadge";

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
}) {
	const resolvedTitle = title || (showTenantName ? rental.tenantName || "Unknown tenant" : getRentalTitle(rental));
	const resolvedSubtitle =
		subtitle ||
		(showTenantName
			? getRentalTitle(rental)
			: rental.requestedTrailerType || "Trailer type pending");
	const resolvedMeta =
		meta ||
		(rental.contractStartDate
			? `${formatDate(rental.contractStartDate)} to ${formatDate(rental.endDate)}`
			: "Dates pending");

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
					<p className="text-sm text-neutral-600 dark:text-neutral-400">
						{resolvedSubtitle}
					</p>
					<p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
						{resolvedMeta}
					</p>
				</div>
				<div className="flex flex-wrap justify-end gap-2">
					{pendingBadge}
					<StatusBadge status={rental.status} />
					{rental.billingStatus ? <StatusBadge status={rental.billingStatus} /> : null}
				</div>
			</div>
		</button>
	);
}
