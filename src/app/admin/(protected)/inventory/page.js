"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import StateCard from "@/components/admin/StateCard";
import StatusBadge from "@/components/admin/StatusBadge";
import { LoadingCardGrid, LoadingPanel } from "@/components/ui/LoadingSkeleton";

const STATUS_ORDER = ["Available", "Reserved", "Rented", "Maintenance"];

export default function AdminInventoryPage() {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		let mounted = true;

		async function loadInventory() {
			try {
				const res = await fetch("/api/admin/inventory");
				const json = await res.json().catch(() => []);

				if (!mounted) return;
				if (!res.ok) {
					setError(
						typeof json?.error === "string"
							? json.error
							: "Failed to load trailer inventory."
					);
					setLoading(false);
					return;
				}

				setData(Array.isArray(json) ? json : []);
				setLoading(false);
			} catch {
				if (!mounted) return;
				setError("Failed to load trailer inventory.");
				setLoading(false);
			}
		}

		loadInventory();
		return () => {
			mounted = false;
		};
	}, []);

	const grouped = useMemo(() => {
		const groups = new Map(STATUS_ORDER.map((status) => [status, []]));
		for (const trailer of data) {
			const list = groups.get(trailer.status) ?? [];
			list.push(trailer);
			groups.set(trailer.status, list);
		}
		return groups;
	}, [data]);

	if (loading) {
		return (
			<div className="space-y-4">
				<LoadingPanel
					title="Loading Inventory"
					subtitle="Fetching trailer inventory by status."
				/>
				<LoadingCardGrid count={4} />
			</div>
		);
	}

	if (error) {
		return (
			<StateCard title="Inventory Unavailable" message={error} tone="error" />
		);
	}

	if (!data.length) {
		return (
			<StateCard
				title="No Inventory Data"
				message="No trailers were returned from Airtable."
			/>
		);
	}

	return (
		<div className="space-y-5">
			{STATUS_ORDER.map((status) => {
				const trailers = grouped.get(status) ?? [];
				return (
					<Card
						key={status}
						className="motion-enter-delayed"
					>
						<div className="flex items-center justify-between">
							<h2 className="font-syne text-xl font-bold text-neutral-950 dark:text-neutral-50">
								{status}
							</h2>
							<span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
								{trailers.length}
							</span>
						</div>
						{trailers.length ? (
							<div className="space-y-3">
								{trailers.map((trailer) => (
									<div
										key={trailer.trailerId}
										className="surface-subtle rounded-lg p-3 flex flex-wrap items-center justify-between gap-3"
									>
										<div>
											<p className="font-semibold text-neutral-950 dark:text-neutral-50">
												{trailer.trailerType || "Trailer"} |{" "}
												{trailer.plateNumber || "No plate"}
											</p>
											<p className="text-sm text-neutral-600 dark:text-neutral-400">
												VIN: {trailer.vin || "-"}
											</p>
											<p className="text-xs text-neutral-600 dark:text-neutral-400">
												Active Assignments: {trailer.activeAssignmentCount ?? 0}
											</p>
										</div>
										<StatusBadge status={trailer.status} />
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-neutral-600 dark:text-neutral-400">
								No trailers in this status.
							</p>
						)}
					</Card>
				);
			})}
		</div>
	);
}
