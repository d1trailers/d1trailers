"use client";

import { useCallback, useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import PaymentLinkAction from "@/components/admin/PaymentLinkAction";
import StateCard from "@/components/admin/StateCard";
import StatusBadge from "@/components/admin/StatusBadge";
import StatusChangeControl from "@/components/admin/StatusChangeControl";
import { LoadingCardGrid, LoadingPanel } from "@/components/ui/LoadingSkeleton";

const RENTAL_STATUS_OPTIONS = [
	"Submitted",
	"Needs Info",
	"Denied",
	"Awaiting First Payment",
	"Active",
	"Overdue",
	"Returned",
	"Cancelled",
];

function formatDate(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleDateString();
}

function formatCurrency(value) {
	if (typeof value !== "number") return "-";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 2,
	}).format(value);
}

export default function AdminRentalsPage() {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const loadRentals = useCallback(async () => {
		try {
			const res = await fetch("/api/admin/rentals");
			const json = await res.json().catch(() => []);

			if (!res.ok) {
				setError(
					typeof json?.error === "string"
						? json.error
						: "Failed to load rentals.",
				);
				setLoading(false);
				return;
			}

			setData(Array.isArray(json) ? json : []);
			setError("");
			setLoading(false);
		} catch {
			setError("Failed to load rentals.");
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadRentals();
	}, [loadRentals]);

	if (loading) {
		return (
			<div className="space-y-4">
				<LoadingPanel
					title="Loading Active Rentals"
					subtitle="Fetching active and pending rental records."
				/>
				<LoadingCardGrid count={4} />
			</div>
		);
	}

	if (error) {
		return (
			<StateCard title="Rentals Unavailable" message={error} tone="error" />
		);
	}

	if (!data.length) {
		return (
			<StateCard
				title="No Active Rentals"
				message="No rentals are currently in active, awaiting first payment, or overdue states."
			/>
		);
	}

	return (
		<div className="space-y-4">
			{data.map((rental) => (
				<Card key={rental.rentalId} className="motion-enter-delayed">
					<div className="flex flex-wrap justify-between gap-3 items-start">
						<div>
							<h2 className="font-semibold text-lg text-neutral-950 dark:text-neutral-50">
								{rental.customerName}
							</h2>
							<p className="text-sm text-neutral-600 dark:text-neutral-400">
								{rental.rentalId}
							</p>
						</div>
						<div className="flex flex-row items-end gap-3 text-sm">
							<div className="flex items-center gap-2">
								<span className="font-medium text-neutral-600 dark:text-neutral-400">
									Rental Status
								</span>
								<StatusChangeControl
									entityType="rental"
									recordId={rental.recordId}
									currentStatus={rental.status}
									options={RENTAL_STATUS_OPTIONS}
									label={`${rental.customerName} | ${rental.rentalId}`}
									onUpdated={loadRentals}
								/>
							</div>
							<div className="flex items-center gap-2">
								<span className="font-medium text-neutral-600 dark:text-neutral-400">
									Billing Status
								</span>
								<StatusBadge
									status={rental.billingStatus || "Billing Pending"}
								/>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-neutral-600 dark:text-neutral-400">
						<p>
							<span className="font-semibold">Billing: </span>
							{rental.billingFrequency || "-"}
						</p>
						<p>
							<span className="font-semibold">Rate: </span>
							{formatCurrency(rental.rate)}
						</p>
						<p>
							<span className="font-semibold">Deposit: </span>
							{formatCurrency(rental.depositAmount)}
						</p>
						<p>
							<span className="font-semibold">Current Period End: </span>
							{formatDate(rental.currentPeriodEnd)}
						</p>
						<p>
							<span className="font-semibold">Assignments: </span>
							{rental.activeAssignmentCount ?? 0}
						</p>
					</div>

					<div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
						<p>
							<span className="font-semibold">Trailers: </span>
							{Array.isArray(rental.trailers) && rental.trailers.length
								? rental.trailers
										.map(
											(trailer) =>
												`${trailer.trailerType || "Trailer"} (${trailer.plateNumber || "No plate"})`,
										)
										.join(", ")
								: "-"}
						</p>

						{Array.isArray(rental.assignments) && rental.assignments.length ? (
							<div className="space-y-2">
								<p className="font-semibold text-neutral-900 dark:text-neutral-100">
									Assignment Timeline
								</p>
								{rental.assignments.map((assignment) => (
									<div
										key={assignment.assignmentId}
										className="surface-subtle rounded-lg p-3"
									>
										<div className="flex flex-wrap items-center justify-between gap-2">
											<p className="font-semibold text-neutral-900 dark:text-neutral-100">
												{assignment.assignmentId}
											</p>
											<StatusBadge status={assignment.status} />
										</div>
										<p>
											Start: {formatDate(assignment.startDate)} | End:{" "}
											{formatDate(assignment.endDate)}
										</p>
										<p>
											Trailers:{" "}
											{Array.isArray(assignment.trailers) &&
											assignment.trailers.length
												? assignment.trailers
														.map(
															(trailer) =>
																`${trailer.trailerType || "Trailer"} (${trailer.plateNumber || "No plate"})`,
														)
														.join(", ")
												: "-"}
										</p>
									</div>
								))}
							</div>
						) : (
							<p>No active assignment timeline recorded.</p>
						)}
					</div>

					{rental.status === "Awaiting First Payment" ||
					rental.status === "Overdue" ? (
						<div className="pt-1">
							<p className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
								Payment Actions
							</p>
							<PaymentLinkAction
								rentalRecordId={rental.recordId}
								label={
									rental.status === "Overdue"
										? "Regenerate Payment Link"
										: "Create Payment Link"
								}
							/>
						</div>
					) : null}
				</Card>
			))}
		</div>
	);
}
