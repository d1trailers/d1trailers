"use client";

import { useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/admin/StatusBadge";
import TenantRentalRequestPanel from "@/components/rentals/TenantRentalRequestPanel";
import AccountUsersManager from "@/components/account/AccountUsersManager";
import TenantRentalModal from "@/components/tenant/TenantRentalModal";
import { buildTenantRentalViews } from "@/lib/viewmodels/tenantWorkspace";
import RentalsSection from "@/components/portal/RentalsSection";
import BillingSection from "@/components/portal/BillingSection";
import SectionHeaderCard from "@/components/portal/SectionHeaderCard";

function formatDateTime(value) {
	if (!value) return "Date pending";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Date pending";
	return date.toLocaleString();
}

function getRentalListLabel(view) {
	if (view.rental.status === "customer_review") {
		return "Rental Proposal";
	}
	if (view.rental.status === "changes_pending") {
		return "Rental Changes Pending";
	}
	if (view.rental.requestKind === "rental_expansion") {
		return "Trailer Request";
	}
	if (view.rental.recordKind === "request") {
		return "Rental Draft";
	}
	return "Rental Agreement";
}

function AggregateTile({ label, value, hint }) {
	return (
		<div className="surface-subtle rounded-2xl p-4">
			<p className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
				{label}
			</p>
			<p className="mt-2 font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
				{value}
			</p>
			<p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{hint}</p>
		</div>
	);
}

function AggregateListCard({
	title,
	description,
	items,
	emptyMessage,
	renderItem,
}) {
	return (
		<Card>
			<div className="space-y-3">
				<div className="space-y-1">
					<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
						{title}
					</h3>
					<p className="text-sm text-neutral-600 dark:text-neutral-400">
						{description}
					</p>
				</div>
				{items.length ? (
					<div className="space-y-3">{items.map(renderItem)}</div>
				) : (
					<div className="rounded-2xl border border-dashed border-(--border-soft) p-4 text-sm text-neutral-600 dark:text-neutral-400">
						{emptyMessage}
					</div>
				)}
			</div>
		</Card>
	);
}

export default function TenantWorkspace({
	activeSection = "overview",
	workspaceData,
	membersData,
	canViewRentals,
	canViewBilling,
	canViewTimeline,
	canViewDocuments,
	canManageRentals,
	canManageMembers,
}) {
	const [rentalSearch, setRentalSearch] = useState("");
	const [billingSearch, setBillingSearch] = useState("");
	const [selectedRentalId, setSelectedRentalId] = useState("");
	const rentalViews = useMemo(() => buildTenantRentalViews(workspaceData), [workspaceData]);
	const selectedRentalView = useMemo(
		() => rentalViews.find((view) => view.rental.id === selectedRentalId) ?? null,
		[rentalViews, selectedRentalId]
	);
	const pendingRentalIds = useMemo(
		() =>
			new Set(
				rentalViews
					.filter((view) => ["customer_review", "changes_pending"].includes(view.rental.status))
					.map((view) => view.rental.id)
			),
		[rentalViews]
	);
	const canSeeRentals = canViewRentals || canManageRentals;

	const filteredRentals = useMemo(() => {
		const query = rentalSearch.trim().toLowerCase();
		if (!query) return rentalViews;
		return rentalViews.filter((view) =>
			[
				view.rental.status,
				view.rental.billingStatus,
				view.rental.requestKind,
				view.rental.requestedTrailerType,
				view.rental.requestSummary,
				getRentalListLabel(view),
			]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(query))
		);
	}, [rentalSearch, rentalViews]);

	const billingViews = useMemo(
		() => rentalViews.filter((view) => view.rental.recordKind === "agreement"),
		[rentalViews]
	);
	const filteredBilling = useMemo(() => {
		const query = billingSearch.trim().toLowerCase();
		if (!query) return billingViews;
		return billingViews.filter((view) =>
			[
				view.rental.status,
				view.rental.billingStatus,
				view.rental.billingFrequency,
				view.rental.lastInvoiceId,
			]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(query))
		);
	}, [billingSearch, billingViews]);

	const aggregateMetrics = useMemo(() => {
		const liveAgreements = rentalViews.filter(
			(view) => view.rental.recordKind === "agreement"
		).length;
		const pendingRequests = rentalViews.filter(
			(view) => view.rental.recordKind === "request" && !view.rental.resolvedAt
		).length;
		const requiredActions = rentalViews.reduce(
			(count, view) => count + view.timeline.actionRequired.length,
			0
		);
		const recentUpdates = rentalViews.reduce(
			(count, view) => count + view.communications.length,
			0
		);

		return [
			{
				label: "Rentals",
				value: rentalViews.length,
				hint: "Requests and agreements connected to this account.",
			},
			{
				label: "Live Agreements",
				value: liveAgreements,
				hint: "Operational rentals currently in service.",
			},
			{
				label: "Open Requests",
				value: pendingRequests,
				hint: "Requests waiting on review or resolution.",
			},
			{
				label: "Action Required",
				value: requiredActions,
				hint: recentUpdates
					? `${recentUpdates} communication update(s) recorded across rentals.`
					: "No communication updates have been recorded yet.",
			},
		];
	}, [rentalViews]);

	const requiredActionItems = useMemo(() => {
		return rentalViews
			.flatMap((view) =>
				view.timeline.actionRequired.map((item) => ({
					id: item.id,
					rentalId: view.rental.id,
					rentalLabel: getRentalListLabel(view),
					title: item.title,
					description: item.description,
					dueAt: item.dueAt,
				}))
			)
			.sort((left, right) =>
				String(left.dueAt || left.id).localeCompare(String(right.dueAt || right.id))
			)
			.slice(0, 6);
	}, [rentalViews]);

	const recentCommunicationItems = useMemo(() => {
		return rentalViews
			.flatMap((view) =>
				view.communications.map((communication) => ({
					id: communication.id,
					rentalId: view.rental.id,
					rentalLabel: getRentalListLabel(view),
					subject: communication.subject || "Update",
					status: communication.status,
					type: communication.type,
					recipientEmail: communication.recipientEmail,
					createdAt: communication.createdAt,
				}))
			)
			.sort((left, right) =>
				String(right.createdAt || "").localeCompare(String(left.createdAt || ""))
			)
			.slice(0, 6);
	}, [rentalViews]);
	const effectiveSection = ["overview", "rentals", "billing", "users"].includes(
		activeSection
	)
		? activeSection
		: "overview";

	return (
		<>
			<div className="space-y-6">
				{effectiveSection === "overview" ? (
					<section className="space-y-4">
					<SectionHeaderCard eyebrow="Overview" title="Account Overview" />

					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
						{aggregateMetrics.map((metric) => (
							<AggregateTile
								key={metric.label}
								label={metric.label}
								value={metric.value}
								hint={metric.hint}
							/>
						))}
					</div>

					{canViewTimeline ? (
						<div className="grid gap-4 xl:grid-cols-2">
							<AggregateListCard
								title="Required Actions"
								description="Actions that still need attention across every rental on this account."
								items={requiredActionItems}
								emptyMessage="No action items are currently outstanding."
								renderItem={(item) => (
									<button
										key={item.id}
										type="button"
										onClick={() => setSelectedRentalId(item.rentalId)}
										className="surface-subtle flex w-full items-start justify-between gap-3 rounded-2xl p-4 text-left transition hover:border hover:border-(--branding-700)"
									>
										<div className="space-y-1">
											<p className="font-semibold text-neutral-950 dark:text-neutral-50">
												{item.title}
											</p>
											<p className="text-sm text-neutral-600 dark:text-neutral-400">
												{item.rentalLabel}
											</p>
											{item.description ? (
												<p className="text-sm text-neutral-600 dark:text-neutral-400">
													{item.description}
												</p>
											) : null}
										</div>
										<div className="flex shrink-0 flex-col items-end gap-2">
											<StatusBadge status="Action Required" />
											<p className="text-xs text-neutral-500 dark:text-neutral-400">
												{formatDateTime(item.dueAt)}
											</p>
										</div>
									</button>
								)}
							/>
							<AggregateListCard
								title="Recent Updates"
								description="The latest communication activity recorded across your rentals."
								items={recentCommunicationItems}
								emptyMessage="No communication updates have been recorded yet."
								renderItem={(item) => (
									<button
										key={item.id}
										type="button"
										onClick={() => setSelectedRentalId(item.rentalId)}
										className="surface-subtle flex w-full items-start justify-between gap-3 rounded-2xl p-4 text-left transition hover:border hover:border-(--branding-700)"
									>
										<div className="space-y-1">
											<p className="font-semibold text-neutral-950 dark:text-neutral-50">
												{item.subject}
											</p>
											<p className="text-sm text-neutral-600 dark:text-neutral-400">
												{item.rentalLabel}
											</p>
											<p className="text-sm text-neutral-600 dark:text-neutral-400">
												{item.recipientEmail || "Recipient pending"}
											</p>
										</div>
										<div className="flex shrink-0 flex-col items-end gap-2">
											<StatusBadge status={item.status || item.type || "Pending"} />
											<p className="text-xs text-neutral-500 dark:text-neutral-400">
												{formatDateTime(item.createdAt)}
											</p>
										</div>
									</button>
								)}
							/>
						</div>
					) : null}
					</section>
				) : null}

				{effectiveSection === "rentals" ? (
					<section className="space-y-4">
					<RentalsSection
						eyebrow="Rentals"
						title="Rentals"
						searchValue={rentalSearch}
						onSearchChange={setRentalSearch}
						searchPlaceholder="Search by status, request type, or trailer type"
						action={canManageRentals ? <TenantRentalRequestPanel compact /> : null}
						loading={false}
						error=""
						records={canSeeRentals ? filteredRentals.map((view) => view.rental) : []}
						onOpenRecord={setSelectedRentalId}
						emptyMessage={
							canSeeRentals
								? "No rentals match this search."
								: "You do not have access to rental records on this account."
						}
						getPendingBadge={(record) =>
							pendingRentalIds.has(record.id) ? <StatusBadge status="Pending" /> : null
						}
					/>
					</section>
				) : null}

				{effectiveSection === "billing" ? (
					<section className="space-y-4">
					<BillingSection
						eyebrow="Billing"
						title="Billing"
						searchValue={billingSearch}
						onSearchChange={setBillingSearch}
						searchPlaceholder="Search by rental status, billing status, or invoice"
						loading={false}
						error=""
						records={canViewBilling ? filteredBilling.map((view) => view.rental) : []}
						onOpenRecord={setSelectedRentalId}
						emptyMessage={
							canViewBilling
								? "No billing records match this search."
								: "You do not have access to billing on this account."
						}
					/>
					</section>
				) : null}

				{effectiveSection === "users" ? (
					<section className="space-y-4">
					<SectionHeaderCard eyebrow="Users" title="Users" />

					{canManageMembers && membersData ? (
						<AccountUsersManager initialData={membersData} />
					) : (
						<Card>
							<p className="text-sm text-neutral-600 dark:text-neutral-400">
								You do not have access to manage users on this account.
							</p>
						</Card>
					)}
					</section>
				) : null}
			</div>

			<TenantRentalModal
				open={Boolean(selectedRentalId)}
				onClose={() => setSelectedRentalId("")}
				rentalView={selectedRentalView}
				canViewBilling={canViewBilling}
				canViewDocuments={canViewDocuments}
				canViewTimeline={canViewTimeline}
				canManageRentals={canManageRentals}
			/>
		</>
	);
}
