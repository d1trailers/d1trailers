"use client";

import { useEffect, useState } from "react";
import MetricCard from "@/components/admin/MetricCard";
import StateCard from "@/components/admin/StateCard";
import Card from "@/components/ui/Card";
import { LoadingCardGrid, LoadingPanel } from "@/components/ui/LoadingSkeleton";

export default function AdminOverviewPage() {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let mounted = true;

		async function loadSummary() {
			try {
				const res = await fetch("/api/admin/summary");
				const json = await res.json().catch(() => ({}));

				if (!mounted) return;
				if (!res.ok) {
					setError(json?.error || "Failed to load admin summary.");
					setLoading(false);
					return;
				}

				setData(json);
				setLoading(false);
			} catch {
				if (!mounted) return;
				setError("Failed to load admin summary.");
				setLoading(false);
			}
		}

		loadSummary();
		return () => {
			mounted = false;
		};
	}, []);

	if (loading) {
		return (
			<div className="space-y-4">
				<LoadingPanel
					title="Loading Overview"
					subtitle="Fetching admin summary metrics."
				/>
				<LoadingCardGrid count={6} />
			</div>
		);
	}

	if (error || !data) {
		return (
			<StateCard
				title="Overview Unavailable"
				message={error || "Failed to load admin summary."}
				tone="error"
			/>
		);
	}

	const trailersByStatus = data.trailersByStatus ?? {};

	return (
		<div className="space-y-5">
			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
				<MetricCard
					label="Applications Pending"
					value={data.applicationsPending}
					hint="Submitted, review, needs info, awaiting payment"
				/>
				<MetricCard label="Awaiting Payment" value={data.awaitingPayment} />
				<MetricCard label="Active Rentals" value={data.activeRentals} />
				<MetricCard label="Overdue Rentals" value={data.overdueRentals} />
				<MetricCard label="Past Due Customers" value={data.pastDueCustomers} />
				<MetricCard
					label="Suspended Customers"
					value={data.suspendedCustomers}
				/>
			</div>

			<Card>
				<h2 className="font-syne text-xl font-bold text-neutral-950 dark:text-neutral-50">
					Trailer Status Snapshot
				</h2>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					{Object.entries(trailersByStatus).map(([status, count]) => (
						<div
							key={status}
							className="surface-subtle rounded-lg p-3"
						>
							<p className="text-xs text-neutral-600 dark:text-neutral-400">
								{status}
							</p>
							<p className="text-xl font-semibold text-neutral-950 dark:text-neutral-50">
								{count}
							</p>
						</div>
					))}
				</div>
			</Card>
		</div>
	);
}
