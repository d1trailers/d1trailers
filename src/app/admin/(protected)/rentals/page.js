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

	useEffect(() => {
		let mounted = true;

		async function loadRentals() {
			try {
				const res = await fetch("/api/admin/rentals");
				const json = await res.json().catch(() => []);

				if (!mounted) return;
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
				setLoading(false);
			} catch {
				if (!mounted) return;
				setError("Failed to load rentals.");
				setLoading(false);
			}
		}

		loadRentals();
		return () => {
			mounted = false;
		};
	}, []);

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
						<div className="flex flex-col items-end gap-2">
							<StatusBadge status={rental.billingStatus} />
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
					</div>
					<p className="text-sm text-neutral-600 dark:text-neutral-400">
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
				</Card>
			))}
		</div>
	);
}
