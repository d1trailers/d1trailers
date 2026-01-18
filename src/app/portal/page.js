"use client";

import { useEffect } from "react";
import Card from "@/components/ui/Card";
import Image from "next/image";
import Link from "next/link";

export default function Portal() {
	useEffect(() => {
		async function loadPortalData() {
			const res = await fetch("/api/portal");

			if (!res.ok) {
				console.error("Failed to load portal data");
				return;
			}

			const data = await res.json();
			console.log("PORTAL DATA:", data);
		}

		loadPortalData();
	}, []);

	const rentals = [
		{
			type: "Dry Van Trailer",
			plate: "TX-38472",
			date: "March 12, 2025",
			billing: "Monthly",
			status: "Active",
		},
		{
			type: "Dry Van Trailer",
			plate: "TX-38472",
			date: "March 12, 2025",
			billing: "Monthly",
			status: "Active",
		},
	];

	const documents = [
		{
			name: "Rental Agreement",
			href: "",
		},
	];

	return (
		<div className="grid grid-flow-row w-full h-full gap-7 mt-25 p-5 md:px-35 lg:px-65">
			<section className="flex flex-col gap-3">
				<p>Welcome,</p>
				<h3 className="font-bold text-3xl md:text-4xl lg:text-5xl">
					Acme Construction
				</h3>
				<div className="inline-flex gap-1 items-center w-fit bg-green-300 text-green-800 font-semibold text-sm px-4 py-1 rounded-full border-2 border-green-500 shadow-sm">
					<Image src="/Trailer.png" alt="Trailer Icon" width={32} height={32} />
					<span className="ml-2">2 Active Rentals</span>
				</div>
			</section>

			<Card className="bg-neutral-200 dark:bg-neutral-800 p-5 flex flex-wrap gap-5 justify-between">
				<div>
					<p className="text-sm text-neutral-500">Account</p>
					<p className="font-semibold">Acme Construction</p>
				</div>
				<div>
					<p className="text-sm text-neutral-500">Primary Email</p>
					<p className="font-medium">billing@acme.com</p>
				</div>
				<div>
					<p className="text-sm text-neutral-500">Status</p>
					<span className="text-green-600 font-semibold">Active</span>
				</div>
			</Card>

			<section className="space-y-5">
				<h4 className="font-bold font-syne text-md md:text-lg lg:text-2xl">
					Rentals Overview
				</h4>
				<div className="flex flex-wrap gap-10">
					{rentals.map((rental, index) => (
						<RentalCard key={index} rental={rental} />
					))}
				</div>
			</section>

			<section className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-5 shadow-sm space-y-5">
				<div className="flex justify-between items-center">
					<h4 className="font-bold font-syne text-md md:text-lg lg:text-2xl">
						Billing Overview
					</h4>
					<Link href="">Manage Billing</Link>
				</div>
			</section>

			<div className="flex gap-4">
				<Link
					href="/api/pay-now"
					className="px-5 py-3 rounded-xl w-full bg-neutral-900 text-neutral-50 font-semibold hover:bg-neutral-950"
				>
					Pay Next Invoice
				</Link>

				<Link
					href=""
					className="px-5 py-3 rounded-xl w-full border border-neutral-400 font-semibold"
				>
					Contact Support
				</Link>
			</div>

			<section className="space-y-5">
				<h4 className="font-bold font-syne text-md md:text-lg lg:text-2xl">
					Your Documents
				</h4>
				<div className="flex flex-wrap gap-10">
					{documents.map((document, index) => (
						<DocumentCard key={index} document={document} />
					))}
				</div>
			</section>
		</div>
	);
}
