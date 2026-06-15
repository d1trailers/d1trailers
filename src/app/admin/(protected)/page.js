"use client";

import { useEffect, useState } from "react";
import MetricCard from "@/components/admin/MetricCard";
import StateCard from "@/components/admin/StateCard";
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
				<LoadingPanel title="Loading Overview" />
				<LoadingCardGrid count={4} />
			</div>
		);
	}

	if (error || !data) {
		return <StateCard title="Overview Unavailable" message={error || "Failed to load admin summary."} tone="error" />;
	}

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
				<MetricCard label="Draft Rentals" value={data.draftRentals ?? 0} hint="Rental drafts still being prepared internally" />
				<MetricCard label="Customer Review" value={data.customerReview ?? 0} hint="Proposals waiting on tenant review or decision" />
				<MetricCard label="Changes Pending" value={data.changesPending ?? 0} hint="Tenant revisions waiting on staff review" />
				<MetricCard label="Awaiting First Payment" value={data.awaitingFirstPayment ?? 0} hint="Accepted agreements waiting on activation payment" />
			</div>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<MetricCard label="Live Agreements" value={data.liveAgreements ?? 0} hint="Agreements currently in service" />
				<MetricCard label="Billing Attention" value={data.billingAttention ?? 0} hint="Past-due or suspended agreements needing review" />
				<MetricCard label="Stale Tenants" value={data.staleTenants ?? 0} hint="Accounts with no live agreements" />
			</div>
		</div>
	);
}
