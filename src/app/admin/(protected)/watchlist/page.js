"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import StateCard from "@/components/admin/StateCard";
import StatusBadge from "@/components/admin/StatusBadge";
import { LoadingCardGrid, LoadingPanel } from "@/components/ui/LoadingSkeleton";

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

	useEffect(() => {
		let mounted = true;

		async function loadWatchlist() {
			try {
				const res = await fetch("/api/admin/watchlist");
				const json = await res.json().catch(() => ({}));

				if (!mounted) return;
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
				setLoading(false);
			} catch {
				if (!mounted) return;
				setError("Failed to load billing watchlist.");
				setLoading(false);
			}
		}

		loadWatchlist();
		return () => {
			mounted = false;
		};
	}, []);

	if (loading) {
		return (
			<div className="space-y-4">
				<LoadingPanel
					title="Loading Watchlist"
					subtitle="Fetching past due and suspended account data."
				/>
				<LoadingCardGrid count={3} />
			</div>
		);
	}

	if (error) {
		return (
			<StateCard title="Watchlist Unavailable" message={error} tone="error" />
		);
	}

	const isEmpty = !data.customers.length && !data.rentals.length;
	if (isEmpty) {
		return (
			<StateCard
				title="Watchlist Clear"
				message="No customers are past due/suspended and no rentals are overdue."
			/>
		);
	}

	return (
		<div className="space-y-5">
			<Card>
				<h2 className="font-syne text-xl font-bold text-neutral-950 dark:text-neutral-50">
					Customer Watchlist
				</h2>
				{data.customers.length ? (
					<div className="space-y-3">
						{data.customers.map((customer) => (
							<div
								key={customer.customerId}
								className="surface-subtle rounded-lg p-3 flex flex-wrap items-center justify-between gap-3"
							>
								<div>
									<p className="font-semibold text-neutral-950 dark:text-neutral-50">
										{customer.companyName || "Unknown Company"}
									</p>
									<p className="text-sm text-neutral-600 dark:text-neutral-400">
										{customer.primaryEmail || "-"}
									</p>
									<p className="text-xs text-neutral-600 dark:text-neutral-400">
										Last Reviewed: {formatDate(customer.reviewedAt)}
									</p>
								</div>
								<StatusBadge status={customer.status} />
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-neutral-600 dark:text-neutral-400">
						No customers on watchlist.
					</p>
				)}
			</Card>

			<Card>
				<h2 className="font-syne text-xl font-bold text-neutral-950 dark:text-neutral-50">
					Overdue Rentals
				</h2>
				{data.rentals.length ? (
					<div className="space-y-3">
						{data.rentals.map((rental) => (
							<div
								key={rental.rentalId}
								className="surface-subtle rounded-lg p-3 flex flex-wrap items-center justify-between gap-3"
							>
								<div>
									<p className="font-semibold text-neutral-950 dark:text-neutral-50">
										{rental.customerName}
									</p>
									<p className="text-sm text-neutral-600 dark:text-neutral-400">
										{rental.rentalId}
									</p>
								</div>
								<div className="flex items-center gap-2">
									<StatusBadge status={rental.status} />
									<StatusBadge status={rental.billingStatus} />
								</div>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-neutral-600 dark:text-neutral-400">
						No overdue rentals.
					</p>
				)}
			</Card>
		</div>
	);
}
