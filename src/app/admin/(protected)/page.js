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
				<LoadingPanel title="Loading Overview" subtitle="Fetching tenant and application metrics." />
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
				<MetricCard label="Lead Tenants" value={data.leads ?? 0} hint="Interest submissions that have not applied yet" />
				<MetricCard label="Applications In Review" value={data.applicationsInReview ?? 0} hint="Applied, under review, or feedback requested" />
				<MetricCard label="Approved Awaiting Activation" value={data.approvedAwaitingActivation ?? 0} hint="Approved but not yet active" />
				<MetricCard label="Active Tenants" value={data.activeTenants ?? 0} hint="Active, past due, or suspended accounts" />
			</div>
		</div>
	);
}
