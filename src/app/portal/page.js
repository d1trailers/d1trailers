"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Link from "next/link";

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

function getApiErrorMessage(json, fallback) {
	return typeof json?.error === "string" ? json.error : fallback;
}

export default function Portal() {
	const [data, setData] = useState(null);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let mounted = true;

		async function loadData() {
			try {
				const res = await fetch("/api/portal");
				const json = await res.json().catch(() => ({}));

				if (!mounted) return;
				if (!res.ok) {
					setError(
						getApiErrorMessage(json, "Failed to load your portal account data.")
					);
					setLoading(false);
					return;
				}

				setData(json);
				setLoading(false);
			} catch {
				if (!mounted) return;
				setError("Failed to load your portal account data.");
				setLoading(false);
			}
		}

		loadData();
		return () => {
			mounted = false;
		};
	}, []);

	if (loading) {
		return (
			<div className="flex min-h-screen w-full items-center justify-center p-5">
				<Card className="w-full max-w-lg bg-neutral-200 dark:bg-neutral-800 shadow-sm p-8">
					<h2 className="text-2xl font-bold text-center">Loading Portal</h2>
					<p className="text-sm text-neutral-600 dark:text-neutral-400 text-center">
						Fetching your rental data.
					</p>
				</Card>
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="flex min-h-screen w-full items-center justify-center p-5">
				<Card className="w-full max-w-lg bg-neutral-200 dark:bg-neutral-800 shadow-sm p-8">
					<h2 className="text-2xl font-bold text-center">Portal Unavailable</h2>
					<p className="text-sm font-semibold text-red-600 text-center">{error}</p>
					<Link href="/login" className="text-center underline font-semibold">
						Return to Login
					</Link>
				</Card>
			</div>
		);
	}

	const customer = data.customer ?? {};
	const rentals = Array.isArray(data.rentals) ? data.rentals : [];
	const documents = Array.isArray(data.documents) ? data.documents : [];

	const activeRentals = rentals.filter((rental) => rental?.status === "Active");
	const billingRental = activeRentals[0] ?? rentals[0] ?? null;

	return (
		<div className="grid grid-flow-row w-full h-full gap-7 mt-25 p-5 md:px-35 lg:px-65">
			<section className="flex flex-col gap-3">
				<p className="text-neutral-600 dark:text-neutral-400">Welcome,</p>
				<h3 className="font-syne font-bold text-3xl md:text-4xl lg:text-5xl text-neutral-950 dark:text-neutral-50">
					{customer.companyName || "Customer"}
				</h3>
				<div className="inline-flex gap-2 items-center w-fit bg-neutral-300 dark:bg-neutral-700 text-neutral-950 dark:text-neutral-50 font-semibold text-sm px-4 py-2 rounded-full border-2 border-neutral-400 dark:border-neutral-600 shadow-sm">
					<span>{activeRentals.length} Active Rentals</span>
				</div>
			</section>

			<Card className="bg-neutral-200 dark:bg-neutral-800 p-5 flex flex-wrap gap-5 justify-between">
				<Info label="Account" value={customer.companyName} />
				<Info label="Primary Email" value={customer.primaryEmail} />
				<Info label="Status" value={customer.status} />
			</Card>

			<section className="space-y-4">
				<h4 className="font-bold font-syne text-md md:text-lg lg:text-2xl text-neutral-950 dark:text-neutral-50">
					Billing Overview
				</h4>
				{billingRental ? (
					<Card className="bg-neutral-100 dark:bg-neutral-700 shadow-sm p-6">
						<Row label="Billing Status" value={billingRental.billingStatus} />
						<Row
							label="Billing Frequency"
							value={billingRental.billingFrequency || "-"}
						/>
						<Row
							label="Next Billing Date"
							value={formatDate(billingRental.currentPeriodEnd)}
						/>
						<Row label="Rate" value={formatCurrency(billingRental.rate)} />
					</Card>
				) : (
					<Card className="bg-neutral-100 dark:bg-neutral-700 shadow-sm p-6">
						<p className="text-neutral-600 dark:text-neutral-400">
							No billing data is currently available.
						</p>
					</Card>
				)}
			</section>

			<section className="space-y-5">
				<h4 className="font-bold font-syne text-md md:text-lg lg:text-2xl text-neutral-950 dark:text-neutral-50">
					Rentals Overview
				</h4>
				{rentals.length > 0 ? (
					<div className="flex flex-wrap gap-6 justify-start items-start">
						{rentals.map((rental, index) => (
							<RentalCard key={rental.id ?? `rental-${index}`} rental={rental} />
						))}
					</div>
				) : (
					<Card className="bg-neutral-100 dark:bg-neutral-700 shadow-sm p-6">
						<p className="text-neutral-600 dark:text-neutral-400">
							No rentals to display.
						</p>
					</Card>
				)}
			</section>

			<section className="space-y-5">
				<h4 className="font-bold font-syne text-md md:text-lg lg:text-2xl text-neutral-950 dark:text-neutral-50">
					Your Documents
				</h4>
				{documents.length > 0 ? (
					<div className="flex flex-wrap gap-6 justify-start items-start">
						{documents.map((document, index) => (
							<DocumentCard
								key={document.id ?? `document-${index}`}
								document={document}
							/>
						))}
					</div>
				) : (
					<Card className="bg-neutral-100 dark:bg-neutral-700 shadow-sm p-6">
						<p className="text-neutral-600 dark:text-neutral-400">
							No documents to display.
						</p>
					</Card>
				)}
			</section>
		</div>
	);
}

function Row({ label, value }) {
	return (
		<div className="flex justify-between gap-5">
			<span className="text-neutral-600 dark:text-neutral-400">{label}</span>
			<span className="font-semibold text-neutral-950 dark:text-neutral-50">
				{value || "-"}
			</span>
		</div>
	);
}

function Info({ label, value }) {
	return (
		<div>
			<p className="text-sm text-neutral-600 dark:text-neutral-400">{label}</p>
			<p className="font-semibold text-neutral-950 dark:text-neutral-50">
				{value || "-"}
			</p>
		</div>
	);
}

function RentalCard({ rental }) {
	const trailers = Array.isArray(rental?.trailers) ? rental.trailers : [];

	return (
		<Card className="w-full max-w-lg bg-neutral-200 dark:bg-neutral-800 shadow-sm p-5 gap-5">
			<div className="flex items-center justify-between gap-4">
				<h3 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50 truncate">
					{rental?.id || "Rental"}
				</h3>
				<span className="px-3 py-1 rounded-full text-sm font-semibold border-2 bg-gray-100 text-gray-800 border-gray-300">
					{rental?.status || "Unknown"}
				</span>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-neutral-600 dark:text-neutral-400">
				<div>
					<span className="font-semibold">Start Date: </span>
					{formatDate(rental?.startDate)}
				</div>
				<div>
					<span className="font-semibold">End Date: </span>
					{formatDate(rental?.endDate)}
				</div>
				<div>
					<span className="font-semibold">Billing: </span>
					{rental?.billingFrequency || "-"}
				</div>
				<div>
					<span className="font-semibold">Rate: </span>
					{formatCurrency(rental?.rate)}
				</div>
			</div>

			<div className="space-y-2">
				<p className="font-semibold text-neutral-950 dark:text-neutral-50">
					Assigned Trailers
				</p>
				{trailers.length > 0 ? (
					<ul className="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
						{trailers.map((trailer, index) => (
							<li key={trailer.id ?? `trailer-${index}`}>
								{trailer.trailerType || "Trailer"} |{" "}
								{trailer.plateNumber || "No plate"} | {trailer.status || "Unknown"}
							</li>
						))}
					</ul>
				) : (
					<p className="text-sm text-neutral-600 dark:text-neutral-400">
						No trailer assigned.
					</p>
				)}
			</div>
		</Card>
	);
}

function DocumentCard({ document }) {
	const attachments = Array.isArray(document?.attachments)
		? document.attachments
		: [];
	const primaryAttachment = attachments[0];

	return (
		<Card className="w-full max-w-lg bg-neutral-200 dark:bg-neutral-700 shadow-sm p-5 gap-5">
			<h3 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50 truncate">
				{document?.select || "Document"}
			</h3>
			<p className="text-sm text-neutral-600 dark:text-neutral-400">
				Uploaded: {formatDate(document?.uploadedAt)}
			</p>
			{primaryAttachment?.url ? (
				<Link
					href={primaryAttachment.url}
					className="underline text-sm text-neutral-950 dark:text-neutral-50"
					target="_blank"
					rel="noopener noreferrer"
				>
					View {primaryAttachment.filename || "Attachment"}
				</Link>
			) : (
				<p className="text-sm text-neutral-600 dark:text-neutral-400">
					No attachment available.
				</p>
			)}
		</Card>
	);
}
