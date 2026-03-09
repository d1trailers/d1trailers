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
	return date.toLocaleString();
}

export default function AdminApplicationsPage() {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let mounted = true;

		async function loadApplications() {
			try {
				const res = await fetch("/api/admin/applications");
				const json = await res.json().catch(() => []);

				if (!mounted) return;
				if (!res.ok) {
					setError(
						typeof json?.error === "string"
							? json.error
							: "Failed to load applications."
					);
					setLoading(false);
					return;
				}

				setData(Array.isArray(json) ? json : []);
				setLoading(false);
			} catch {
				if (!mounted) return;
				setError("Failed to load applications.");
				setLoading(false);
			}
		}

		loadApplications();
		return () => {
			mounted = false;
		};
	}, []);

	if (loading) {
		return (
			<div className="space-y-4">
				<LoadingPanel
					title="Loading Applications"
					subtitle="Fetching the application review queue."
				/>
				<LoadingCardGrid count={4} />
			</div>
		);
	}

	if (error) {
		return (
			<StateCard
				title="Applications Unavailable"
				message={error}
				tone="error"
			/>
		);
	}

	if (!data.length) {
		return (
			<StateCard
				title="No Applications"
				message="There are no customers currently in submitted, review, needs info, or awaiting payment states."
			/>
		);
	}

	return (
		<div className="space-y-4">
			{data.map((application) => (
				<Card
					key={application.customerId}
					className="motion-enter-delayed"
				>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2 className="font-semibold text-lg text-neutral-950 dark:text-neutral-50">
								{application.companyName || "Unknown Company"}
							</h2>
							<p className="text-sm text-neutral-600 dark:text-neutral-400">
								{application.primaryEmail || "-"}
							</p>
						</div>
						<StatusBadge status={application.status} />
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-neutral-600 dark:text-neutral-400">
						<p>
							<span className="font-semibold">Submitted At: </span>
							{formatDate(application.submittedAt)}
						</p>
						<p>
							<span className="font-semibold">Reviewed At: </span>
							{formatDate(application.reviewedAt)}
						</p>
					</div>
					{application.reviewNotes ? (
						<p className="text-sm text-neutral-700 dark:text-neutral-300">
							<span className="font-semibold">Review Notes: </span>
							{application.reviewNotes}
						</p>
					) : null}
				</Card>
			))}
		</div>
	);
}
