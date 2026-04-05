"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import StateCard from "@/components/admin/StateCard";
import StatusBadge from "@/components/admin/StatusBadge";
import StatusChangeControl from "@/components/admin/StatusChangeControl";
import { LoadingCardGrid, LoadingPanel } from "@/components/ui/LoadingSkeleton";

const TRAILER_STATUS_OPTIONS = ["Available", "Reserved", "Rented", "Maintenance"];

function formatDate(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleDateString();
}

export default function AdminInventoryPage() {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const loadInventory = useCallback(async () => {
		try {
			const res = await fetch("/api/admin/inventory");
			const json = await res.json().catch(() => []);

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
			setError("");
			setLoading(false);
		} catch {
			setError("Failed to load trailer inventory.");
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadInventory();
	}, [loadInventory]);

	const grouped = useMemo(() => {
		const statusOrder = ["Available", "Reserved", "Rented", "Maintenance"];
		const groups = new Map(statusOrder.map((status) => [status, []]));
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
				<LoadingPanel title="Loading Inventory" subtitle="Fetching trailer inventory by status." />
				<LoadingCardGrid count={4} />
			</div>
		);
	}

	if (error) {
		return <StateCard title="Inventory Unavailable" message={error} tone="error" />;
	}

	if (!data.length) {
		return <StateCard title="No Inventory Data" message="No trailers were returned from Airtable." />;
	}

	return (
		<div className="space-y-5">
			{TRAILER_STATUS_OPTIONS.map((status) => {
				const trailers = grouped.get(status) ?? [];
				return (
					<Card key={status} className="motion-enter-delayed relative overflow-visible z-0 focus-within:z-40">
						<div className="flex items-center justify-between">
							<h2 className="font-syne text-xl font-bold text-neutral-950 dark:text-neutral-50">{status}</h2>
							<span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{trailers.length}</span>
						</div>
						{trailers.length ? (
							<div className="space-y-3">
								{trailers.map((trailer) => (
									<div key={trailer.trailerId} className="surface-subtle relative overflow-visible rounded-lg p-3 space-y-3">
										<div className="flex flex-wrap items-center justify-between gap-3">
											<div>
												<p className="font-semibold text-neutral-950 dark:text-neutral-50">{trailer.trailerType || "Trailer"} | {trailer.plateNumber || "No plate"}</p>
												<p className="text-sm text-neutral-600 dark:text-neutral-400">VIN: {trailer.vin || "-"}</p>
												<p className="text-xs text-neutral-600 dark:text-neutral-400">Active Assignments: {trailer.activeAssignmentCount ?? 0}</p>
											</div>
											<StatusChangeControl
												entityType="trailer"
												recordId={trailer.recordId}
												currentStatus={trailer.status}
												options={TRAILER_STATUS_OPTIONS}
												label={`${trailer.trailerType || "Trailer"} | ${trailer.plateNumber || trailer.trailerId}`}
												onUpdated={loadInventory}
											/>
										</div>

										{Array.isArray(trailer.assignments) && trailer.assignments.length ? (
											<div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
												<p className="font-semibold text-neutral-900 dark:text-neutral-100">Current Assignment Coverage</p>
												{trailer.assignments.map((assignment) => (
													<div key={assignment.assignmentId} className="rounded-lg border border-(--border-soft) bg-white/70 dark:bg-neutral-950/30 p-3">
														<div className="flex flex-wrap items-center justify-between gap-2">
															<p className="font-semibold text-neutral-900 dark:text-neutral-100">{assignment.assignmentId}</p>
															<StatusBadge status={assignment.status} />
														</div>
														<p>Start: {formatDate(assignment.startDate)} | End: {formatDate(assignment.endDate)}</p>
														<p>Rentals: {Array.isArray(assignment.rentalIds) && assignment.rentalIds.length ? assignment.rentalIds.join(", ") : "-"}</p>
													</div>
												))}
											</div>
										) : Array.isArray(trailer.linkedRentals) && trailer.linkedRentals.length ? (
											<div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
												<p className="font-semibold text-neutral-900 dark:text-neutral-100">Linked Rental Coverage</p>
												{trailer.linkedRentals.map((rental) => (
													<div key={rental.recordId} className="rounded-lg border border-(--border-soft) bg-white/70 dark:bg-neutral-950/30 p-3">
														<div className="flex flex-wrap items-center justify-between gap-2">
															<p className="font-semibold text-neutral-900 dark:text-neutral-100">{rental.rentalId}</p>
															<StatusBadge status={rental.status} />
														</div>
														<p>Contract Start: {formatDate(rental.contractStartDate)} | End: {formatDate(rental.endDate)}</p>
													</div>
												))}
											</div>
										) : (
											<p className="text-sm text-neutral-600 dark:text-neutral-400">No active assignments tied to this trailer.</p>
										)}
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-neutral-600 dark:text-neutral-400">No trailers in this status.</p>
						)}
					</Card>
				);
			})}
		</div>
	);
}
