"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Image from "next/image";
import Link from "next/link";

export default function Portal() {
	const [data, setData] = useState(null);
	const [error, setError] = useState("");

	useEffect(() => {
		async function loadData() {
			const res = await fetch("/api/portal");
			if (!res.ok) {
				setError(
					"Encountered fatal error while attempting to load portal data"
				);
				return;
			}
			const json = await res.json();
			setData(json);
		}
		loadData();
	}, []);

	if (error || !data) {
		return (
			<div className="flex min-h-screen w-full items-center justify-center p-5">
				<Card className="w-full max-w-lg bg-neutral-200 dark:bg-neutral-800 shadow-sm p-8 gap-10">
					<h2 className="text-2xl font-bold w-full text-center">
						{error ? "Error Loading Portal" : "Loading Portal"}
					</h2>
					{error && (
						<p className="text-sm font-semibold text-red-600">{error}</p>
					)}
				</Card>
			</div>
		);
	}

	const { customer, rentals } = data;

	return (
		<div className="grid grid-flow-row w-full h-full gap-7 mt-25 p-5 md:px-35 lg:px-65">
			<section className="flex flex-col gap-3">
				<p className="text-neutral-600 dark:text-neutral-400">Welcome,</p>
				<h3 className="font-syne font-bold text-3xl md:text-4xl lg:text-5xl text-neutral-950 dark:text-neutral-50">
					{customer.companyName}
				</h3>
				<div className="inline-flex gap-1 items-center w-fit bg-neutral-300 dark:bg-neutral-700 text-neutral-950 dark:text-neutral-50 font-semibold text-sm px-4 py-1 rounded-full border-2 border-neutral-400 dark:border-neutral-600 shadow-sm">
					<Image src="/Trailer.png" alt="Trailer Icon" width={32} height={32} />
					<span className="ml-2">
						{rentals.filter((r) => r.status === "Active").length} Active Rentals
					</span>
				</div>
			</section>

			<Card className="bg-neutral-200 dark:bg-neutral-800 p-5 flex flex-wrap gap-5 justify-between">
				<Info label="Account" value={customer.companyName} />
				<Info label="Primary Email" value={customer.email} />
				<Info label="Status" value={customer.status} />
			</Card>

			<h4 className="font-bold font-syne text-md md:text-lg lg:text-2xl text-neutral-950 dark:text-neutral-50">
				Billing Overview
			</h4>
			<section className="bg-neutral-100 dark:bg-neutral-700 rounded-2xl p-5 shadow-sm space-y-5">
				<div className="flex justify-between items-center">
					<div className="flex gap-7 font-semibold">
						<Link href="">Manage Billing</Link>
						<Link href="/api/pay-now">Pay Now</Link>
					</div>
				</div>

				{rentals.filter((r) => r.status === "Active")[0] ? (
					<Card className="w-full mx-auto bg-neutral-200 dark:bg-neutral-800 shadow-sm p-8 gap-5">
						<div className="flex justify-between">
							<span>Next Billing Date:</span>
							<span className="font-medium">
								{rentals.filter((r) => r.status === "Active")[0]
									.currentPeriodEnd || "—"}
							</span>
						</div>
						<div className="flex justify-between">
							<span>Amount Due:</span>
							<span className="font-semibold text-red-600 dark:text-red-400">
								$
								{rentals
									.filter((r) => r.status === "Active")[0]
									.rate?.toFixed(2) ?? "0.00"}
							</span>
						</div>
						<div className="flex justify-between">
							<span>Payment Method:</span>
							<span className="font-medium">Card on File</span>
						</div>
					</Card>
				) : (
					<Card className="w-full mx-auto bg-neutral-200 dark:bg-neutral-800 shadow-sm p-8 text-center">
						<p className="text-neutral-600 dark:text-neutral-400">
							No active rentals for billing.
						</p>
					</Card>
				)}
			</section>

			<section className="space-y-5">
				<h4 className="font-bold font-syne text-md md:text-lg lg:text-2xl text-neutral-950 dark:text-neutral-50">
					Rentals Overview
				</h4>
				<div className="flex flex-wrap gap-10 justify-start items-start">
					{rentals.length > 0 ? (
						rentals.map((r, i) => (
							<RentalCard key={r.rentalId ?? `rental-${i}`} rental={r} />
						))
					) : (
						<p className="text-neutral-600 dark:text-neutral-400">
							No rentals to display
						</p>
					)}
				</div>
			</section>

			<section className="space-y-5">
				<h4 className="font-bold font-syne text-md md:text-lg lg:text-2xl text-neutral-950 dark:text-neutral-50">
					Your Documents
				</h4>
				<div className="flex flex-wrap gap-10 justify-start items-start">
					{customer.documents?.length > 0 ||
					rentals.flatMap((r) => r.documents ?? []).length > 0 ? (
						<>
							{customer.documents?.map((doc) => (
								<DocumentCard
									key={`customer-${doc.documentId}`}
									document={doc}
								/>
							))}
							{rentals
								.flatMap((r) => r.documents ?? [])
								.map((doc) => (
									<DocumentCard
										key={`rental-${doc.documentId}-${doc.name}`}
										document={doc}
									/>
								))}
						</>
					) : (
						<p className="text-neutral-600 dark:text-neutral-400">
							No documents to display
						</p>
					)}
				</div>
			</section>
		</div>
	);
}

function Info({ label, value }) {
	return (
		<div>
			<p className="text-sm text-neutral-600 dark:text-neutral-400">{label}</p>
			<p className="font-semibold text-neutral-950 dark:text-neutral-50">
				{value}
			</p>
		</div>
	);
}

function RentalCard({ rental }) {
	const trailer = rental.trailer || {};
	return (
		<Card className="w-full max-w-lg bg-neutral-200 dark:bg-neutral-800 shadow-sm p-5 gap-5">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50 truncate">
					{trailer.type || "Unknown Trailer"}
				</h3>
				<span
					className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${
						rental.status === "Active"
							? "bg-green-300 text-green-800 border-green-500"
							: "bg-gray-100 text-gray-800 border-gray-300"
					}`}
				>
					{rental.status}
				</span>
			</div>

			<div className="flex items-center gap-3">
				<Image
					src="/Trailer.png"
					alt="Trailer Icon"
					width={32}
					height={32}
					className="rounded-full p-1 bg-neutral-400 dark:bg-neutral-600"
				/>
				<p className="font-medium text-neutral-700 dark:text-neutral-300">
					{trailer.plate || "—"}
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-neutral-600 dark:text-neutral-400">
				<div>
					<span className="font-semibold">Rental Started: </span>
					{rental.date || "—"}
				</div>
				<div>
					<span className="font-semibold">Billing: </span>
					{rental.billingFrequency || "—"}
				</div>
				<div>
					<span className="font-semibold">Rate: </span>${rental.rate ?? "—"}
				</div>
				<div>
					<span className="font-semibold">Next Billing: </span>
					{rental.currentPeriodEnd ?? "—"}
				</div>
			</div>
		</Card>
	);
}

function DocumentCard({ document }) {
	return (
		<Card className="w-full max-w-lg bg-neutral-200 dark:bg-neutral-700 shadow-sm p-5 gap-5">
			<h3 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50 truncate">
				{document.name}
			</h3>
			<p className="text-sm text-neutral-600 dark:text-neutral-400">
				Uploaded: {document.uploadedAt}
			</p>
			{document.type && (
				<p className="text-sm text-neutral-600 dark:text-neutral-400">
					Type: {document.type}
				</p>
			)}
			{document.file && (
				<Link
					href={document.file.url}
					className="underline text-sm text-neutral-950 dark:text-neutral-50"
					target="_blank"
				>
					View Document
				</Link>
			)}
		</Card>
	);
}
