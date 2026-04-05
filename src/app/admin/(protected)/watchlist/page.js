"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import StateCard from "@/components/admin/StateCard";
import StatusBadge from "@/components/admin/StatusBadge";
import StatusChangeControl from "@/components/admin/StatusChangeControl";
import { LoadingCardGrid, LoadingPanel } from "@/components/ui/LoadingSkeleton";

const CUSTOMER_STATUS_OPTIONS = [
	"Submitted",
	"Review",
	"Needs Info",
	"Awaiting Payment",
	"Active",
	"Past Due",
	"Suspended",
	"Denied",
];
const RENTAL_STATUS_OPTIONS = [
	"Submitted",
	"Awaiting First Payment",
	"Active",
	"Overdue",
	"Returned",
	"Cancelled ",
];

function formatDate(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleDateString();
}

export default function AdminWatchlistPage() {
	const [data, setData] = useState({ customers: [], rentals: [] });
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const loadWatchlist = useCallback(async () => {
		try {
			const res = await fetch("/api/admin/watchlist");
			const json = await res.json().catch(() => ({}));

			if (!res.ok) {
				setError(
					typeof json?.error === "string"
						? json.error
						: "Failed to load billing watchlist."
				);
				setLoading(false);
				return;
			}

			setData({
				customers: Array.isArray(json?.customers) ? json.customers : [],
				rentals: Array.isArray(json?.rentals) ? json.rentals : [],
			});
			setError("");
			setLoading(false);
		} catch {
			setError("Failed to load billing watchlist.");
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadWatchlist();
	}, [loadWatchlist]);

	if (loading) {
		return (
			<div className="space-y-4">
				<LoadingPanel title="Loading Watchlist" subtitle="Fetching past due and suspended account data." />
				<LoadingCardGrid count={3} />
			</div>
		);
	}

	if (error) {
		return <StateCard title="Watchlist Unavailable" message={error} tone="error" />;
	}

	const isEmpty = !data.customers.length && !data.rentals.length;
	if (isEmpty) {
		return <StateCard title="Watchlist Clear" message="No customers are past due/suspended and no rentals are overdue." />;
	}

	return (
		<div className="space-y-5">
			<Card>
				<h2 className="font-syne text-xl font-bold text-neutral-950 dark:text-neutral-50">Customer Watchlist</h2>
				{data.customers.length ? (
					<div className="space-y-3">
						{data.customers.map((customer) => (
							<div key={customer.customerId} className="surface-subtle rounded-lg p-3 space-y-3">
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div>
										<p className="font-semibold text-neutral-950 dark:text-neutral-50">{customer.companyName || "Unknown Company"}</p>
										<p className="text-sm text-neutral-600 dark:text-neutral-400">{customer.primaryEmail || "-"}</p>
										<p className="text-xs text-neutral-600 dark:text-neutral-400">Last Reviewed: {formatDate(customer.reviewedAt)}</p>
									</div>
									<StatusChangeControl
										entityType="customer"
										recordId={customer.recordId}
										currentStatus={customer.status}
										options={CUSTOMER_STATUS_OPTIONS}
										label={`${customer.companyName || "Customer"} | ${customer.primaryEmail || customer.customerId}`}
										onUpdated={loadWatchlist}
									/>
								</div>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-neutral-600 dark:text-neutral-400">No customers on watchlist.</p>
				)}
			</Card>

			<Card>
				<h2 className="font-syne text-xl font-bold text-neutral-950 dark:text-neutral-50">Overdue Rentals</h2>
				{data.rentals.length ? (
					<div className="space-y-3">
						{data.rentals.map((rental) => (
							<div key={rental.rentalId} className="surface-subtle rounded-lg p-3 space-y-3">
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div>
										<p className="font-semibold text-neutral-950 dark:text-neutral-50">{rental.customerName}</p>
										<p className="text-sm text-neutral-600 dark:text-neutral-400">{rental.rentalId}</p>
									</div>
									<div className="flex items-center gap-2">
										<StatusChangeControl
											entityType="rental"
											recordId={rental.recordId}
											currentStatus={rental.status}
											options={RENTAL_STATUS_OPTIONS}
											label={`${rental.customerName} | ${rental.rentalId}`}
											onUpdated={loadWatchlist}
										/>
										<StatusBadge status={rental.billingStatus} />
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-neutral-600 dark:text-neutral-400">No overdue rentals.</p>
				)}
			</Card>
		</div>
	);
}
