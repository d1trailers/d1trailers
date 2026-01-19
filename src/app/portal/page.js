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
				setError("Failed to load portal data");
				return;
			}
			const json = await res.json();
			console.log("PORTAL DATA:", json);
			setData(json);
		}
		loadData();
	}, []);

	if (error) {
		return <p className="p-10 text-red-600">{error}</p>;
	}

	if (!data) {
		return <p className="p-10">Loading portal…</p>;
	}

	const { customer, rentals } = data;

	return (
		<div className="grid gap-8 p-6 md:px-32 mt-25">
			<section className="space-y-3">
				<p className="text-sm text-neutral-500">Welcome,</p>
				<h1 className="text-4xl font-bold">{customer.companyName}</h1>

				<div className="inline-flex items-center gap-2 bg-green-300 text-green-800 px-4 py-1 rounded-full border-2 border-green-500">
					<Image src="/Trailer.png" width={28} height={28} alt="" />
					<span>{rentals.length} Active Rentals</span>
				</div>
			</section>
			<Card className="p-5 flex flex-wrap gap-6 justify-between">
				<Info label="Account" value={customer.companyName} />
				<Info label="Primary Email" value={customer.email} />
				<Info label="Status" value={customer.status} />
			</Card>
			<section className="space-y-5">
				<h2 className="text-2xl font-bold">Your Rentals</h2>

				<div className="flex flex-wrap gap-8">
					{rentals.map((rental) => (
						<RentalCard key={rental.rentalId} rental={rental} />
					))}
				</div>
			</section>
			<section className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-5 space-y-4">
				<h2 className="text-xl font-bold">Billing</h2>
				<p className="text-sm text-neutral-500">
					Billing is securely handled through Stripe.
				</p>

				<Link
					href="/api/pay-now"
					className="inline-block bg-neutral-900 text-white px-5 py-3 rounded-xl font-semibold"
				>
					Manage Billing
				</Link>
			</section>
			<section className="space-y-5">
				<h2 className="text-2xl font-bold">Documents</h2>

				<div className="flex flex-wrap gap-8">
					{rentals
						.flatMap((r) => r.documents ?? [])
						.filter(Boolean)
						.map((doc) => (
							<DocumentCard key={doc.documentId} document={doc} />
						))}
				</div>
			</section>
		</div>
	);
}

/* -------------------------------------------------- */

function Info({ label, value }) {
	return (
		<div>
			<p className="text-sm text-neutral-500">{label}</p>
			<p className="font-semibold">{value}</p>
		</div>
	);
}

function RentalCard({ rental }) {
	const { trailer } = rental;

	return (
		<Card className="w-full max-w-lg p-5 space-y-4">
			<div className="flex justify-between">
				<h3 className="text-lg font-bold">{trailer.type}</h3>
				<StatusBadge status={rental.status} />
			</div>

			<div className="flex items-center gap-3">
				<Image src="/Trailer.png" width={32} height={32} alt="" />
				<p className="font-medium">{trailer.plate}</p>
			</div>

			<div className="text-sm text-neutral-600 space-y-1">
				<p>Billing: {rental.billingFrequency}</p>
				<p>Rate: ${rental.rate}</p>
				<p>Next Billing Date: {rental.currentPeriodEnd ?? "—"}</p>
			</div>
		</Card>
	);
}

function StatusBadge({ status }) {
	const active = status === "Active";
	return (
		<span
			className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${
				active
					? "bg-green-300 text-green-800 border-green-500"
					: "bg-gray-200 text-gray-800 border-gray-400"
			}`}
		>
			{status}
		</span>
	);
}

function DocumentCard({ document }) {
	return (
		<Card className="w-full max-w-sm p-5 space-y-3">
			<h4 className="font-semibold">{document.type}</h4>
			<p className="text-sm text-neutral-500">Uploaded {document.uploadedAt}</p>

			{document.file && (
				<Link
					href={document.file.url}
					target="_blank"
					className="underline text-sm"
				>
					View Document
				</Link>
			)}
		</Card>
	);
}
