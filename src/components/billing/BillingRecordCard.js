"use client";

import StatusBadge from "@/components/admin/StatusBadge";

function formatDate(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleDateString();
}

function formatCurrency(value) {
	const numericValue = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(numericValue)) return "-";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 2,
	}).format(numericValue);
}

function formatLabel(value) {
	if (!value) return "-";
	return String(value)
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

export default function BillingRecordCard({
	record,
	onClick,
	title,
	subtitle,
	meta,
	showTenantName = false,
}) {
	const invoices = Array.isArray(record.billingInvoices) ? record.billingInvoices : [];
	const latestInvoice = invoices[0] ?? null;
	const resolvedTitle =
		title ||
		(showTenantName
			? record.tenantName || "Unknown tenant"
			: formatCurrency(latestInvoice?.amountRemaining ?? record.rate));
	const resolvedSubtitle =
		subtitle ||
		[
			`Billing frequency: ${formatLabel(record.billingFrequency)}`,
			latestInvoice?.status
				? `Invoice: ${formatLabel(latestInvoice.status)}`
				: null,
		]
			.filter(Boolean)
			.join(" · ");
	const resolvedMeta =
		meta ||
		(latestInvoice
			? `Due ${formatCurrency(latestInvoice.amountDue)} · Paid ${formatCurrency(
					latestInvoice.amountPaid,
				)} · Remaining ${formatCurrency(latestInvoice.amountRemaining)}`
			: record.currentPeriodEnd
				? `Current period end ${formatDate(record.currentPeriodEnd)}`
				: record.lastInvoiceId
					? `Last invoice ${record.lastInvoiceId}`
					: "No invoice activity yet");

	return (
		<button
			type="button"
			onClick={() => onClick(record.id)}
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
				<div className="flex flex-col items-end gap-2">
					<div className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
						Rental Status
					</div>
					<StatusBadge status={record.status} />
					<div className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
						Billing Status
					</div>
					<StatusBadge status={record.billingStatus} />
				</div>
			</div>
		</button>
	);
}
