"use client";

import Section from "@/components/structure/Section";
import Card from "@/components/ui/Card";
import Image from "next/image";
import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { useState } from "react";

const FAQS = [
	{
		title: "What are the requirements to rent?",
		answers: [
			"To rent a dry van from D1Trailers, you need property damage insurance to cover potential loss or theft. A refundable deposit is also required and returned if equipment is in good condition at return.",
			"There is a minimum rental period of 3 months so operators have enough time to run consistently with the unit.",
		],
	},
	{
		title: "What does the rental agreement include?",
		answers: [
			"Our rental agreement includes trailers with DOT-ready tires and brakes for safe operation.",
			"During the rental term, you are responsible for maintenance. If our team must handle a repair, the cost is passed through to your account.",
		],
	},
	{
		title: "How quickly can I rent a trailer?",
		answers: [
			"Most qualified applications can be processed within 48 hours. After review and approval, we coordinate pickup and onboarding.",
		],
	},
	{
		title: "What payment methods are accepted?",
		answers: [
			"We support card-based billing and recurring monthly payments through our billing system.",
		],
	},
	{
		title: "Do you offer long-term discounts?",
		answers: [
			"Pricing is fixed and transparent. Contact us directly if you have a larger fleet need and want to discuss availability planning.",
		],
	},
	{
		title: "What if I have an issue with the trailer?",
		answers: [
			"Contact support immediately. We will guide your next step and keep you informed until the issue is resolved.",
		],
	},
];

const EXPECTATION_PILLARS = [
	{
		title: "Straightforward Onboarding",
		description:
			"Applications are manually reviewed and most qualified submissions can be completed within 48 hours.",
	},
	{
		title: "Operationally Ready Equipment",
		description:
			"Dry vans are delivered with inspection-focused standards so teams can deploy quickly and confidently.",
	},
	{
		title: "Predictable Monthly Billing",
		description:
			"Billing terms are fixed, visible, and managed through a clear customer portal workflow.",
	},
	{
		title: "Built for Consistent Operations",
		description:
			"Every part of the rental lifecycle is structured to keep expectations clear for both sides: application, approval, assignment, and recurring service.",
	},
];

const ABOUT_US_POINTS = [
	"D1Trailers is focused on dependable dry van rentals for owner-operators and small fleets.",
	"We keep rental operations practical: clear terms, consistent equipment standards, and direct communication from application through active support.",
	"Our goal is long-term working relationships built on predictable service and straightforward billing expectations.",
];

export default function Home() {
	return (
		<div className="grid grid-flow-row h-full gap-10 pb-10">
			<section className="motion-enter relative mt-24 md:mt-28 w-full h-[58vh] md:h-[70vh] lg:h-[78vh] overflow-hidden">
				<Image
					src="/banner-alternate.png"
					alt="D1Trailers fleet"
					fill
					className="object-cover"
					style={{
						filter: "brightness(0.72) contrast(1.08)",
					}}
					priority
				/>
				<div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/35 to-transparent" />
				<div className="absolute inset-0 flex flex-col justify-center px-5 md:px-15 lg:px-25 text-neutral-50">
					<div className="motion-enter-delayed max-w-8xl space-y-5">
						<p className="inline-flex items-center rounded-full border border-neutral-100/40 bg-neutral-900/30 px-4 py-1 text-xs uppercase tracking-[0.18em]">
							Dry Van Rentals
						</p>
						<h1 className="font-syne text-lg md:text-6xl lg:text-8xl font-extrabold leading-[0.95]">
							Dependable Trailers.
							<br />
							Clear Terms.
						</h1>
						<p className="max-w-2xl text-sm md:text-base lg:text-lg text-neutral-100/90">
							D1Trailers keeps rental operations simple: fixed pricing, reliable
							equipment, and straightforward support for owner-operators and
							small fleets.
						</p>
						<div className="flex flex-wrap gap-3">
							<Link
								href="/apply"
								className="rounded-xl bg-(--branding-600) px-5 py-3 font-semibold text-neutral-50 no-underline hover:no-underline hover:bg-(--branding-700) transition-colors"
							>
								Start Application
							</Link>
							<Link
								href="/login"
								className="rounded-xl border border-neutral-50/40 bg-neutral-900/25 px-5 py-3 font-semibold text-neutral-50 no-underline hover:no-underline hover:bg-neutral-900/40 transition-colors"
							>
								Client Portal
							</Link>
						</div>
					</div>
				</div>
			</section>

			<Section className="gap-6">
				<div className="flex items-end justify-between gap-3">
					<h2 className="font-syne text-2xl md:text-4xl font-bold">
						What You Can Expect
					</h2>
					<p className="text-sm hidden lg:block text-neutral-600 dark:text-neutral-400">
						Clear process from application to deployment
					</p>
				</div>
				<div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-5">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{EXPECTATION_PILLARS.map((pillar) => (
							<Card key={pillar.title} className="surface-panel p-5 gap-3">
								<h3 className="font-syne text-xl font-bold">{pillar.title}</h3>
								<p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
									{pillar.description}
								</p>
							</Card>
						))}
					</div>
					<Card className="surface-subtle p-6">
						<h3 className="font-syne text-2xl font-bold">About Us</h3>
						<div className="space-y-3">
							{ABOUT_US_POINTS.map((item) => (
								<p
									key={item}
									className="text-neutral-800 dark:text-neutral-200 leading-relaxed"
								>
									{item}
								</p>
							))}
						</div>
					</Card>
				</div>
			</Section>

			<Section className="gap-6">
				<div className="flex items-end justify-between gap-3">
					<h3 className="font-syne text-xl md:text-3xl font-bold">
						Trailers We Offer
					</h3>
					<p className="text-sm hidden lg:block text-neutral-600 dark:text-neutral-400">
						Current rental lineup
					</p>
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
					<ServiceCard
						name="53' Dry Vans"
						cost="Inquire for pricing"
						imageSrc="/Trailer.png"
						info="Dry van trailers are enclosed and road-proven for secure transport and storage. We prioritize reliability, clean handoff, and straightforward terms."
					/>
					<Card className="surface-subtle">
						<h4 className="font-syne text-2xl font-bold">About Our Lineup</h4>
						<p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
							Our current fleet is centered on our{" "}
							<span className="font-semibold">53' dry vans</span> for teams that
							need secure enclosed capacity and consistent availability for our
							customers.
						</p>
						<ul className="text-sm space-y-2 text-neutral-700 list-disc list-inside dark:text-neutral-300">
							<li>General freight and logistics operations</li>
							<li>Storage, staging, and overflow yard use</li>
							<li>Regional and long-haul deployment</li>
						</ul>
					</Card>
				</div>
			</Section>

			<Section className="gap-6">
				<h3 className="font-syne text-xl md:text-3xl font-bold">
					Frequently Asked Questions
				</h3>
				<div className="flex flex-col gap-4">
					{FAQS.map((faq) => (
						<QuestionCard key={faq.title} title={faq.title}>
							<div className="flex flex-col gap-4">
								{faq.answers.map((answer, index) => (
									<p key={`${faq.title}-${index}`}>{answer}</p>
								))}
							</div>
						</QuestionCard>
					))}
				</div>
			</Section>
		</div>
	);
}

function QuestionCard({ title, children }) {
	const [expanded, setExpanded] = useState(false);

	return (
		<button
			onClick={() => setExpanded((value) => !value)}
			className="surface-panel w-full rounded-2xl p-5 text-left transition-[background-color,border-color] hover:bg-neutral-100/65 dark:hover:bg-neutral-800/60"
		>
			<div className="flex justify-between items-start gap-4 border-b border-(--border-soft) pb-4">
				<h4 className="font-semibold uppercase text-sm md:text-base">
					{title}
				</h4>
				<XMarkIcon
					className={`w-5 h-5 transition-transform duration-300 ${
						expanded ? "rotate-0" : "rotate-45"
					}`}
				/>
			</div>
			<div
				className={`overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-in-out ${
					expanded ? "max-h-screen opacity-100 mt-4" : "max-h-0 opacity-0 mt-0"
				}`}
			>
				<div className="surface-subtle rounded-lg p-4 text-neutral-700 dark:text-neutral-300 leading-relaxed">
					{children}
				</div>
			</div>
		</button>
	);
}

function ServiceCard({ name, cost, imageSrc, info }) {
	return (
		<Card className="surface-panel p-6 gap-5">
			<div className="flex items-center gap-4 border-b border-(--border-soft) pb-4">
				<div className="relative w-12 h-12 rounded-full overflow-hidden bg-(--branding-300)/35 shadow-inner">
					<Image
						src={imageSrc}
						alt={`${name} icon`}
						fill
						className="object-contain p-1"
					/>
				</div>
				<h4 className="font-syne text-2xl font-bold uppercase">{name}</h4>
			</div>
			<p className="text-sm font-semibold dark:text-neutral-50 light:text-(--branding-700)">
				{cost}
			</p>
			<p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
				{info}
			</p>
		</Card>
	);
}
