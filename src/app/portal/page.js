"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Link from "next/link";
import {
	ArrowTopRightOnSquareIcon,
	BanknotesIcon,
	CalendarDaysIcon,
	CheckCircleIcon,
	CreditCardIcon,
	ExclamationTriangleIcon,
	LifebuoyIcon,
} from "@heroicons/react/24/outline";
import {
	LoadingCardGrid,
	LoadingPanel,
	SkeletonBlock,
	SkeletonLine,
} from "@/components/ui/LoadingSkeleton";

const BILLING_ACTION_REQUIRED_STATUSES = new Set([
	"Awaiting First Payment",
	"Past Due",
	"Suspended",
	"Unpaid",
]);
const BILLING_ACTION_REQUIRED_RENTAL_STATUSES = new Set([
	"Awaiting First Payment",
	"Overdue",
]);

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

function getBillingPriority(rental) {
	if (!rental) return 99;

	if (rental.status === "Overdue" || rental.billingStatus === "Past Due") return 0;
	if (rental.billingStatus === "Suspended") return 1;
	if (rental.billingStatus === "Unpaid") return 2;
	if (
		rental.status === "Awaiting First Payment" ||
		rental.billingStatus === "Awaiting First Payment"
	)
		return 3;
	if (rental.billingStatus === "Active" || rental.status === "Active") return 4;
	if (rental.billingStatus === "Cancelled" || rental.status === "Cancelled")
		return 5;
	if (rental.status === "Returned") return 6;
	return 7;
}

function getEstimatedAmountDue(rental) {
	if (!rental) return null;

	const rate = typeof rental.rate === "number" ? rental.rate : null;
	const depositAmount =
		typeof rental.depositAmount === "number" ? rental.depositAmount : null;

	if (
		rental.status === "Awaiting First Payment" ||
		rental.billingStatus === "Awaiting First Payment"
	) {
		const total = (rate ?? 0) + (depositAmount ?? 0);
		return total > 0 ? total : null;
	}

	if (
		rental.status === "Overdue" ||
		BILLING_ACTION_REQUIRED_STATUSES.has(rental.billingStatus)
	) {
		return rate;
	}

	return null;
}

function getBillingStateMeta(rental) {
	if (!rental) {
		return {
			tone: "neutral",
			title: "No billing activity yet",
			description:
				"We'll show recurring billing details here once your rental billing is active.",
			Icon: CreditCardIcon,
		};
	}

	if (rental.status === "Overdue" || rental.billingStatus === "Past Due") {
		return {
			tone: "danger",
			title: "Payment action needed",
			description:
				"A recent payment is overdue. Use Pay Now or contact D1Trailers so we can help you get the account current.",
			Icon: ExclamationTriangleIcon,
		};
	}

	if (rental.billingStatus === "Suspended") {
		return {
			tone: "danger",
			title: "Billing is suspended",
			description:
				"Your account needs billing attention before service can fully return to normal.",
			Icon: ExclamationTriangleIcon,
		};
	}

	if (
		rental.status === "Awaiting First Payment" ||
		rental.billingStatus === "Awaiting First Payment"
	) {
		return {
			tone: "warning",
			title: "First payment is pending",
			description:
				"Your rental is approved, but the first payment still needs to be completed before activation.",
			Icon: BanknotesIcon,
		};
	}

	if (rental.billingStatus === "Unpaid") {
		return {
			tone: "warning",
			title: "Outstanding balance due",
			description:
				"There is an unpaid balance on this account. Use Pay Now or reach out if you need billing support.",
			Icon: BanknotesIcon,
		};
	}

	if (rental.billingStatus === "Active" || rental.status === "Active") {
		return {
			tone: "success",
			title: "Billing is active",
			description:
				"Recurring billing is in good standing. You can review billing details or manage payment information at any time.",
			Icon: CheckCircleIcon,
		};
	}

	if (rental.billingStatus === "Cancelled" || rental.status === "Cancelled") {
		return {
			tone: "neutral",
			title: "Billing has ended",
			description:
				"This rental is no longer in active billing. Contact D1Trailers if you think this status is incorrect.",
			Icon: CreditCardIcon,
		};
	}

	return {
		tone: "neutral",
		title: "Billing details available",
		description:
			"Use the actions below to review billing details or get help with your account.",
		Icon: CreditCardIcon,
	};
}

function getBillingToneClasses(tone) {
	switch (tone) {
		case "danger":
			return {
				panel:
					"border-red-200/80 bg-red-50/70 dark:border-red-900/80 dark:bg-red-950/30",
				iconWrap:
					"bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-200",
				eyebrow: "text-red-700 dark:text-red-200",
			};
		case "warning":
			return {
				panel:
					"border-amber-200/80 bg-amber-50/75 dark:border-amber-900/70 dark:bg-amber-950/25",
				iconWrap:
					"bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-200",
				eyebrow: "text-amber-700 dark:text-amber-200",
			};
		case "success":
			return {
				panel:
					"border-emerald-200/80 bg-emerald-50/75 dark:border-emerald-900/80 dark:bg-emerald-950/25",
				iconWrap:
					"bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-200",
				eyebrow: "text-emerald-700 dark:text-emerald-200",
			};
		default:
			return {
				panel:
					"border-(--border-soft) bg-neutral-50/80 dark:bg-neutral-900/45",
				iconWrap:
					"bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
				eyebrow: "text-neutral-600 dark:text-neutral-400",
			};
	}
}

function needsBillingAttention(rental) {
	return (
		BILLING_ACTION_REQUIRED_STATUSES.has(rental?.billingStatus) ||
		BILLING_ACTION_REQUIRED_RENTAL_STATUSES.has(rental?.status)
	);
}

function getPayNowLabel(rental) {
	if (
		rental?.status === "Awaiting First Payment" ||
		rental?.billingStatus === "Awaiting First Payment"
	) {
		return "Pay First Invoice";
	}

	return "Pay Now";
}

export default function Portal() {
	const [data, setData] = useState(null);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(true);
	const [billingActionLoading, setBillingActionLoading] = useState("");
	const [billingActionTarget, setBillingActionTarget] = useState("");
	const [billingActionMessage, setBillingActionMessage] = useState("");
	const [billingActionTone, setBillingActionTone] = useState("muted");

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
			<div className="w-full min-h-screen mt-25 p-5 md:px-12 lg:px-20 pb-12 space-y-5 motion-enter">
				<LoadingPanel
					title="Loading portal data"
					subtitle="Preparing account, billing, and document details."
				/>
				<div className="surface-panel rounded-2xl p-5 space-y-3">
					<SkeletonLine className="w-40 h-6" />
					<SkeletonBlock className="w-full h-28" />
				</div>
				<LoadingCardGrid count={3} />
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
	const sortedBillingRentals = [...rentals].sort(
		(left, right) => getBillingPriority(left) - getBillingPriority(right)
	);
	const billingRental = sortedBillingRentals[0] ?? null;
	const billingAttentionRentals = sortedBillingRentals.filter(needsBillingAttention);
	const summaryRental = billingAttentionRentals[0] ?? billingRental;
	const summaryTone = getBillingStateMeta(summaryRental);
	const summaryToneClasses = getBillingToneClasses(summaryTone.tone);
	const nextBillingDate = sortedBillingRentals
		.map((rental) => rental?.currentPeriodEnd)
		.filter(Boolean)
		.sort()[0];
	const totalEstimatedDue = billingAttentionRentals.reduce((total, rental) => {
		const value = getEstimatedAmountDue(rental);
		return typeof value === "number" ? total + value : total;
	}, 0);
	const hasEstimatedAmountDue = totalEstimatedDue > 0;

	async function runBillingAction(action, options = {}) {
		if (!action) return;
		const rentalId =
			typeof options.rentalId === "string" ? options.rentalId : null;
		const target = options.target || rentalId || "account";
		const actionKey = `${action}:${target}`;

		setBillingActionLoading(actionKey);
		setBillingActionTarget(target);
		setBillingActionMessage("");
		setBillingActionTone("muted");

		try {
			const response = await fetch(`/api/portal/${action}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					rentalId,
				}),
			});
			const json = await response.json().catch(() => ({}));

			if (!response.ok) {
				setBillingActionTarget(target);
				setBillingActionTone("error");
				setBillingActionMessage(
					getApiErrorMessage(json, "Billing action failed.")
				);
				setBillingActionLoading("");
				return;
			}

			if (json?.url) {
				window.location.href = json.url;
				return;
			}

			setBillingActionTarget(target);
			setBillingActionTone(json?.mode === "disabled" ? "warning" : "success");
			setBillingActionMessage(
				typeof json?.message === "string"
					? json.message
					: "Billing action is ready."
			);
			setBillingActionLoading("");
		} catch {
			setBillingActionTarget(target);
			setBillingActionTone("error");
			setBillingActionMessage("Billing action failed.");
			setBillingActionLoading("");
		}
	}

	const billingActionMessageClass =
		billingActionTone === "error"
			? "text-red-600"
			: billingActionTone === "success"
				? "text-emerald-600"
				: billingActionTone === "warning"
					? "text-amber-600"
					: "text-neutral-600 dark:text-neutral-400";

	return (
		<div className="grid grid-flow-row w-full h-full gap-7 mt-25 p-5 md:px-12 lg:px-20 pb-12 motion-enter">
			<section className="surface-panel rounded-2xl p-5 md:p-6 flex flex-col gap-3">
				<p className="text-neutral-600 dark:text-neutral-400">Welcome,</p>
				<h3 className="font-syne font-bold text-3xl md:text-4xl lg:text-5xl text-neutral-950 dark:text-neutral-50">
					{customer.companyName || "Customer"}
				</h3>
				<div className="inline-flex gap-2 items-center w-fit surface-subtle text-neutral-950 dark:text-neutral-50 font-semibold text-sm px-4 py-2 rounded-full">
					<span>{activeRentals.length} Active Rentals</span>
				</div>
			</section>

			<Card className="p-5 flex flex-wrap gap-5 justify-between">
				<Info label="Account" value={customer.companyName} />
				<Info label="Primary Email" value={customer.primaryEmail} />
				<Info label="Status" value={customer.status} />
			</Card>

			<section className="space-y-4">
				<h4 className="font-bold font-syne text-md md:text-lg lg:text-2xl text-neutral-950 dark:text-neutral-50">
					Billing Overview
				</h4>
				{billingRental ? (
					<div className="space-y-4">
						<div className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-4">
							<Card
								className={`border p-6 gap-6 ${summaryToneClasses.panel}`}
							>
								<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
									<div className="flex items-start gap-4">
										<div
											className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${summaryToneClasses.iconWrap}`}
										>
											<summaryTone.Icon className="h-6 w-6" />
										</div>
										<div className="space-y-2">
											<p
												className={`text-xs font-semibold uppercase tracking-[0.2em] ${summaryToneClasses.eyebrow}`}
											>
												Billing Snapshot
											</p>
											<div className="space-y-1">
												<h5 className="text-xl font-syne font-bold text-neutral-950 dark:text-neutral-50">
													{summaryTone.title}
												</h5>
												<p className="max-w-2xl text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
													{summaryTone.description}
												</p>
											</div>
										</div>
									</div>
									{summaryRental?.id ? (
										<div className="surface-subtle rounded-xl px-4 py-3 text-sm">
											<p className="text-neutral-600 dark:text-neutral-400">
												Rental in focus
											</p>
											<p className="font-semibold text-neutral-950 dark:text-neutral-50">
												{summaryRental.id}
											</p>
										</div>
									) : null}
								</div>

								<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
									<MetricTile
										icon={BanknotesIcon}
										label="Estimated Due Now"
										value={
											hasEstimatedAmountDue
												? formatCurrency(totalEstimatedDue)
												: "Nothing due"
										}
									/>
									<MetricTile
										icon={CalendarDaysIcon}
										label="Next Billing Date"
										value={formatDate(nextBillingDate)}
									/>
									<MetricTile
										icon={CreditCardIcon}
										label="Rentals Requiring Attention"
										value={String(billingAttentionRentals.length)}
									/>
								</div>

								<div className="flex flex-wrap gap-2">
									<ActionButton
										label="Manage Billing"
										icon={ArrowTopRightOnSquareIcon}
										onClick={() =>
											runBillingAction("manage-billing", { target: "account" })
										}
										loading={
											billingActionLoading === "manage-billing:account"
										}
										tone="secondary"
									/>
									{summaryRental ? (
										<ActionButton
											label={getPayNowLabel(summaryRental)}
											icon={BanknotesIcon}
											onClick={() =>
												runBillingAction("pay-now", {
													rentalId: summaryRental.id,
													target: "summary",
												})
											}
											loading={billingActionLoading === "pay-now:summary"}
											tone="primary"
										/>
									) : null}
								</div>

								{billingActionMessage &&
								["account", "summary"].includes(billingActionTarget) ? (
									<p className={`text-sm ${billingActionMessageClass}`}>
										{billingActionMessage}
									</p>
								) : null}
							</Card>

							<Card className="surface-subtle p-6 gap-4">
								<div className="flex items-start gap-3">
									<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
										<LifebuoyIcon className="h-6 w-6" />
									</div>
									<div className="space-y-1">
										<h5 className="text-xl font-syne font-bold text-neutral-950 dark:text-neutral-50">
											Need billing help?
										</h5>
										<p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
											If a payment looks wrong, you need an updated invoice, or
											you want help before your next due date, contact our team
											directly.
										</p>
									</div>
								</div>
								<div className="grid grid-cols-1 gap-3 text-sm">
									<a
										href="mailto:inquiries@d1trailers.com"
										className="surface-panel rounded-xl px-4 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-100/90 dark:text-neutral-50 dark:hover:bg-neutral-800/80"
									>
										inquiries@d1trailers.com
									</a>
									<a
										href="tel:4693191226"
										className="surface-panel rounded-xl px-4 py-3 font-semibold text-neutral-950 transition hover:bg-neutral-100/90 dark:text-neutral-50 dark:hover:bg-neutral-800/80"
									>
										469.319.1226
									</a>
								</div>
								<p className="text-sm text-neutral-600 dark:text-neutral-400">
									For security, billing actions only appear for your current
									account records.
								</p>
							</Card>
						</div>

						<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
							{sortedBillingRentals.map((rental, index) => (
								<BillingRentalCard
									key={rental.id ?? `billing-rental-${index}`}
									rental={rental}
									isPrimary={rental.id === summaryRental?.id}
									onPayNow={() =>
										runBillingAction("pay-now", {
											rentalId: rental.id,
											target: rental.id,
										})
									}
									payNowLoading={billingActionLoading === `pay-now:${rental.id}`}
									message={
										billingActionTarget === rental.id
											? billingActionMessage
											: ""
									}
									messageClassName={billingActionMessageClass}
								/>
							))}
						</div>
					</div>
				) : (
					<Card className="surface-subtle p-6">
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
					<Card className="surface-subtle p-6">
						<p className="text-neutral-600 dark:text-neutral-400">
							No rentals to display.
						</p>
					</Card>
				)}
			</section>

			<section className="space-y-5">
				<h4 className="font-bold font-syne text-md md:text-lg lg:text-2xl text-neutral-950 dark:text-neutral-50">
					Customer Documents
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
					<Card className="surface-subtle p-6">
						<p className="text-neutral-600 dark:text-neutral-400">
							No customer-level documents to display.
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

function MetricTile({ icon: Icon, label, value }) {
	return (
		<div className="surface-panel rounded-xl px-4 py-4">
			<div className="flex items-center gap-3">
				<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
					<Icon className="h-5 w-5" />
				</div>
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
						{label}
					</p>
					<p className="text-base font-semibold text-neutral-950 dark:text-neutral-50">
						{value}
					</p>
				</div>
			</div>
		</div>
	);
}

function ActionButton({
	label,
	icon: Icon,
	onClick,
	loading = false,
	tone = "primary",
}) {
	const toneClass =
		tone === "secondary"
			? "border border-(--border-soft) text-neutral-900 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-900"
			: "bg-(--branding-700) text-neutral-50 hover:bg-(--branding-800)";

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={loading}
			className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${toneClass}`}
		>
			<Icon className="h-4 w-4" />
			{loading ? "Preparing" : label}
		</button>
	);
}

function BillingRentalCard({
	rental,
	isPrimary = false,
	onPayNow,
	payNowLoading = false,
	message = "",
	messageClassName = "",
}) {
	const estimatedDue = getEstimatedAmountDue(rental);
	const tone = getBillingStateMeta(rental);
	const toneClasses = getBillingToneClasses(tone.tone);

	return (
		<Card
			className={`border p-5 gap-5 ${isPrimary ? toneClasses.panel : "surface-subtle border-(--border-soft)"}`}
		>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="space-y-1">
					<div className="flex flex-wrap items-center gap-2">
						<h5 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50">
							{rental?.id || "Rental"}
						</h5>
						{isPrimary ? (
							<span className="rounded-full bg-neutral-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-50 dark:bg-neutral-50 dark:text-neutral-950">
								In Focus
							</span>
						) : null}
					</div>
					<p className="text-sm text-neutral-600 dark:text-neutral-400">
						{tone.title}
					</p>
				</div>
				<div className="space-y-1 text-right text-sm">
					<p className="text-neutral-600 dark:text-neutral-400">Billing Status</p>
					<p className="font-semibold text-neutral-950 dark:text-neutral-50">
						{rental?.billingStatus || "-"}
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
				<Row label="Rental Status" value={rental?.status} />
				<Row label="Billing Frequency" value={rental?.billingFrequency || "-"} />
				<Row
					label="Next Billing Date"
					value={formatDate(rental?.currentPeriodEnd)}
				/>
				<Row label="Rate" value={formatCurrency(rental?.rate)} />
				<Row
					label="Deposit Amount"
					value={formatCurrency(rental?.depositAmount)}
				/>
				<Row
					label="Estimated Due Now"
					value={
						typeof estimatedDue === "number"
							? formatCurrency(estimatedDue)
							: "Nothing due"
					}
				/>
			</div>

			{needsBillingAttention(rental) ? (
				<div className="flex flex-wrap gap-2">
					<ActionButton
						label={getPayNowLabel(rental)}
						icon={BanknotesIcon}
						onClick={onPayNow}
						loading={payNowLoading}
					/>
				</div>
			) : null}

			{message ? <p className={`text-sm ${messageClassName}`}>{message}</p> : null}
		</Card>
	);
}

function RentalCard({ rental }) {
	const trailers = Array.isArray(rental?.trailers) ? rental.trailers : [];
	const assignments = Array.isArray(rental?.assignments) ? rental.assignments : [];
	const documents = Array.isArray(rental?.documents) ? rental.documents : [];

	return (
		<Card className="w-full max-w-xl p-5 gap-5">
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
					<span className="font-semibold">Billing Status: </span>
					{rental?.billingStatus || "-"}
				</div>
				<div>
					<span className="font-semibold">Next Billing Date: </span>
					{formatDate(rental?.currentPeriodEnd)}
				</div>
				<div>
					<span className="font-semibold">Contract Start: </span>
					{formatDate(rental?.contractStartDate)}
				</div>
				<div>
					<span className="font-semibold">Operational Start: </span>
					{formatDate(rental?.operationalStartDate)}
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
				<div>
					<span className="font-semibold">Deposit: </span>
					{formatCurrency(rental?.depositAmount)}
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

			<div className="space-y-2">
				<p className="font-semibold text-neutral-950 dark:text-neutral-50">
					Assignment Timeline
				</p>
				{assignments.length > 0 ? (
					<ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
						{assignments.map((assignment, index) => (
							<li
								key={assignment.id ?? `assignment-${index}`}
								className="surface-subtle rounded-lg p-3"
							>
								<div className="font-semibold text-neutral-900 dark:text-neutral-100">
									{formatDate(assignment.startDate)} to{" "}
									{formatDate(assignment.endDate)}
								</div>
								<div>Status: {assignment.status || "-"}</div>
								<div>
									Trailers:{" "}
									{assignment.trailers?.length
										? assignment.trailers
												.map(
													(trailer) =>
														`${trailer.trailerType || "Trailer"} (${trailer.plateNumber || "No plate"})`
												)
												.join(", ")
										: "-"}
								</div>
								{assignment.notes && <div>Notes: {assignment.notes}</div>}
							</li>
						))}
					</ul>
				) : (
					<p className="text-sm text-neutral-600 dark:text-neutral-400">
						No assignment timeline available.
					</p>
				)}
			</div>

			<div className="space-y-2">
				<p className="font-semibold text-neutral-950 dark:text-neutral-50">
					Rental Documents
				</p>
				{documents.length > 0 ? (
					<div className="space-y-3">
						{documents.map((document, index) => (
							<DocumentCard
								key={document.id ?? `rental-document-${index}`}
								document={document}
								compact
							/>
						))}
					</div>
				) : (
					<p className="text-sm text-neutral-600 dark:text-neutral-400">
						No rental-level documents.
					</p>
				)}
			</div>
		</Card>
	);
}

function DocumentCard({ document, compact = false }) {
	const attachments = Array.isArray(document?.attachments)
		? document.attachments
		: [];
	const primaryAttachment = attachments[0];

	return (
		<Card className={`w-full ${compact ? "max-w-none" : "max-w-lg"} p-5 gap-4`}>
			<h3 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50 truncate">
				{document?.type || "Document"}
			</h3>
			<p className="text-sm text-neutral-600 dark:text-neutral-400">
				Category: {document?.category || "-"}
			</p>
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
