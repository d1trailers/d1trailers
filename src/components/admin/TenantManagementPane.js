"use client";

import { useMemo } from "react";
import {
	ClockIcon,
	EnvelopeIcon,
	FolderOpenIcon,
	PlusIcon,
	RectangleStackIcon,
} from "@heroicons/react/24/outline";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/admin/StatusBadge";
import ActionButton from "@/components/ui/ActionButton";
import { buildRentalTrailerTypeSummary } from "@/lib/trailerTypes";
import { prettifyEnumLabel } from "@/lib/displayLabels";

const TAB_ITEMS = [
	{ id: "rentals", label: "Rentals", icon: RectangleStackIcon },
	{ id: "trailers", label: "Trailers", icon: FolderOpenIcon },
];

function formatDate(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString();
}

function formatDateOnly(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleDateString();
}

function formatLabel(value) {
	return prettifyEnumLabel(value);
}

function dedupeById(items) {
	const seen = new Set();
	return items.filter((item) => {
		if (!item?.id || seen.has(item.id)) return false;
		seen.add(item.id);
		return true;
	});
}

function getRentalDocumentCount(rental, application) {
	const applicationDocuments = Array.isArray(application?.documents)
		? application.documents
		: [];
	const rentalDocuments = Array.isArray(rental?.documents) ? rental.documents : [];
	return dedupeById([...applicationDocuments, ...rentalDocuments]).length;
}

function getRentalTitle(rental) {
	if (!rental) return "Rental";
	if (rental.status === "customer_review") return "Rental Proposal";
	if (rental.status === "changes_pending") return "Changes Pending";
	if (rental.request_kind === "rental_expansion") {
		return "Trailer Request";
	}
	if (rental.record_kind === "request") {
		return "Rental Draft";
	}
	return "Rental Agreement";
}

function formatRentalTrailerSummary(rental) {
	const summary = buildRentalTrailerTypeSummary(rental);
	return summary.length
		? summary.map((item) => `${item.label} x ${item.count}`).join(", ")
		: "Trailer type pending";
}

function EmptySection({ title, message }) {
	return (
		<div className="rounded-2xl border border-dashed border-(--border-soft) bg-white/70 p-5 text-sm text-neutral-600 dark:bg-neutral-950/30 dark:text-neutral-400">
			<p className="font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>
			<p className="mt-2">{message}</p>
		</div>
	);
}

function MetricTile({ label, value, hint }) {
	return (
		<div className="surface-subtle rounded-2xl p-4">
			<p className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
				{label}
			</p>
			<p className="mt-2 font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
				{value}
			</p>
			{hint ? (
				<p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{hint}</p>
			) : null}
		</div>
	);
}

function buildRentalViews(detail) {
	const applicationsById = new Map(
		(detail.applications || []).map((application) => [application.id, application])
	);
	const tenantTimelineItems = Array.isArray(detail.timelineItems) ? detail.timelineItems : [];
	const tenantCommunications = Array.isArray(detail.communications) ? detail.communications : [];

	return (detail.rentals || []).map((rental) => {
		const application = rental.application || applicationsById.get(rental.application_id) || null;
		const applicationTimelineItems = Array.isArray(application?.timeline_items)
			? application.timeline_items
			: [];
		const timelineItems = dedupeById([
			...applicationTimelineItems,
			...tenantTimelineItems.filter((item) => {
				if (item.rental_id) {
					return item.rental_id === rental.id;
				}
				return Boolean(rental.application_id && item.application_id === rental.application_id);
			}),
		]);
		const communications = tenantCommunications.filter((communication) => {
			if (communication?.rental_id) {
				return communication.rental_id === rental.id;
			}
			if (communication?.payload_snapshot?.rentalId) {
				return communication.payload_snapshot.rentalId === rental.id;
			}
			return Boolean(rental.application_id && communication.application_id === rental.application_id);
		});
		const trailers = dedupeById(
			(rental.assignments || []).map((assignment) => assignment.trailer).filter(Boolean)
		);

		return {
			rental,
			application,
			trailers,
			timelineCount: timelineItems.length,
			communicationCount: communications.length,
			documentCount: getRentalDocumentCount(rental, application),
		};
	});
}

function buildTrailerViews(rentalViews) {
	const trailerMap = new Map();
	for (const rentalView of rentalViews) {
		for (const assignment of rentalView.rental.assignments || []) {
			if (!assignment.trailer) continue;
			const current = trailerMap.get(assignment.trailer.id) || {
				...assignment.trailer,
				linkedRentals: [],
			};
			current.linkedRentals.push({
				id: rentalView.rental.id,
				status: rentalView.rental.status,
				recordKind: rentalView.rental.record_kind,
				assignmentStatus: assignment.status,
			});
			trailerMap.set(assignment.trailer.id, current);
		}
	}
	return [...trailerMap.values()];
}

export default function TenantManagementPane({
	detail,
	loading,
	error,
	activeTab,
	onTabChange,
	onCreateRental,
	onOpenRental,
	onOpenTrailer,
}) {
	const rentalViews = useMemo(() => (detail ? buildRentalViews(detail) : []), [detail]);
	const trailerViews = useMemo(() => buildTrailerViews(rentalViews), [rentalViews]);

	if (loading) {
		return (
			<Card>
				<p className="text-sm text-neutral-600 dark:text-neutral-400">Loading...</p>
			</Card>
		);
	}

	if (error) {
		return <EmptySection title="Tenant Unavailable" message={error} />;
	}

	if (!detail) {
		return <EmptySection title="Select a Tenant" message="Select a tenant to continue." />;
	}

	const metrics = [
		{
			label: "Rentals",
			value: rentalViews.length,
			hint: "Requests and agreements on this account.",
		},
		{
			label: "Open Requests",
			value: rentalViews.filter(
				(rentalView) =>
					rentalView.rental.record_kind === "request" && !rentalView.rental.resolved_at
			).length,
			hint: "Unresolved rental requests.",
		},
		{
			label: "Assigned Trailers",
			value: trailerViews.length,
			hint: "Physical trailers linked through assignments.",
		},
		{
			label: "Communications",
			value: detail.communications.length,
			hint: "Recorded communication events across this account.",
		},
	];

	return (
		<div className="space-y-4">
			<Card className="gap-4">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="space-y-2">
						<p className="text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
							Tenant Management
						</p>
						<h2 className="font-syne text-3xl font-bold text-neutral-950 dark:text-neutral-50">
							{detail.tenant.display_name}
						</h2>
						<div className="flex flex-wrap gap-2 text-sm text-neutral-600 dark:text-neutral-400">
							<span className="inline-flex items-center gap-2">
								<EnvelopeIcon className="h-4 w-4" aria-hidden="true" />
								{detail.tenant.primary_email}
							</span>
							{detail.tenant.primary_phone ? <span>{detail.tenant.primary_phone}</span> : null}
							<span className="inline-flex items-center gap-2">
								<ClockIcon className="h-4 w-4" aria-hidden="true" />
								Updated {formatDate(detail.tenant.updated_at)}
							</span>
						</div>
					</div>
					<StatusBadge status={detail.tenant.status} />
				</div>

				<div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
					{metrics.map((metric) => (
						<MetricTile key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} />
					))}
				</div>
			</Card>

			<div className="flex flex-wrap gap-2">
				{TAB_ITEMS.map((tab) => {
					const Icon = tab.icon;
					const active = tab.id === activeTab;
					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => onTabChange(tab.id)}
							className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-(--branding-700) text-neutral-50" : "surface-subtle text-neutral-800 dark:text-neutral-100"}`}
						>
							<Icon className="h-5 w-5" aria-hidden="true" />
							{tab.label}
						</button>
					);
				})}
			</div>

			{activeTab === "rentals" ? (
				<div className="space-y-4">
					<Card>
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div>
								<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
									Rentals on This Account
								</h3>
								<p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
									Rental workflow lives inside each rental. Open any rental below to manage terms, assignments, communications, and timeline updates in the shared rental modal.
								</p>
							</div>
							<ActionButton type="button" tone="primary" onClick={onCreateRental}>
								<PlusIcon className="h-5 w-5" aria-hidden="true" />
								Add Rental
							</ActionButton>
						</div>
					</Card>

					{rentalViews.length ? (
						<div className="space-y-3">
							{rentalViews.map((rentalView) => (
								<button
									key={rentalView.rental.id}
									type="button"
									onClick={() => onOpenRental(rentalView.rental.id)}
									className="w-full rounded-2xl border border-(--border-soft) bg-white/80 p-5 text-left transition hover:border-(--branding-700) hover:bg-red-50/30 dark:bg-neutral-950/40 dark:hover:bg-red-950/10"
								>
									<div className="space-y-4">
										<div className="flex flex-wrap items-start justify-between gap-4">
											<div className="space-y-2">
												<p className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
													{getRentalTitle(rentalView.rental)}
												</p>
												<p className="text-sm text-neutral-600 dark:text-neutral-400">
													{rentalView.application?.company_name || detail.tenant.display_name} | {formatRentalTrailerSummary(rentalView.rental)}
												</p>
												<div className="flex flex-wrap gap-4 text-xs text-neutral-500 dark:text-neutral-400">
													<span>Start {formatDateOnly(rentalView.rental.contract_start_date)}</span>
													<span>End {formatDateOnly(rentalView.rental.end_date)}</span>
													<span>{(rentalView.rental.assignments || []).length} assignment(s)</span>
												</div>
											</div>
											<div className="flex flex-wrap justify-end gap-2">
												<StatusBadge status={rentalView.rental.record_kind} />
												<StatusBadge status={rentalView.rental.status} />
												<StatusBadge status={rentalView.rental.billing_status} />
											</div>
										</div>

										<div className="grid gap-3 md:grid-cols-4">
											<div className="surface-subtle rounded-2xl px-4 py-3">
												<p className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">Trailers</p>
												<p className="mt-2 font-semibold text-neutral-950 dark:text-neutral-50">{rentalView.trailers.length}</p>
											</div>
											<div className="surface-subtle rounded-2xl px-4 py-3">
												<p className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">Documents</p>
												<p className="mt-2 font-semibold text-neutral-950 dark:text-neutral-50">{rentalView.documentCount}</p>
											</div>
											<div className="surface-subtle rounded-2xl px-4 py-3">
												<p className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">Timeline</p>
												<p className="mt-2 font-semibold text-neutral-950 dark:text-neutral-50">{rentalView.timelineCount}</p>
											</div>
											<div className="surface-subtle rounded-2xl px-4 py-3">
												<p className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">Updates</p>
												<p className="mt-2 font-semibold text-neutral-950 dark:text-neutral-50">{rentalView.communicationCount}</p>
											</div>
										</div>

										<p className="text-sm font-semibold text-(--branding-700)">Open rental management</p>
									</div>
								</button>
							))}
						</div>
					) : (
						<EmptySection title="No Rentals Yet" message="No rentals are attached to this account." />
					)}
				</div>
			) : null}

			{activeTab === "trailers" ? (
				<div className="space-y-4">
					<Card>
						<div>
							<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
								Trailers on This Account
							</h3>
							<p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
								Physical trailers are derived from rental assignments. Open any trailer for full inventory and lifecycle management.
							</p>
						</div>
					</Card>

					{trailerViews.length ? (
						<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
							{trailerViews.map((trailer) => (
								<button
									key={trailer.id}
									type="button"
									onClick={() => onOpenTrailer(trailer.id)}
									className="rounded-2xl border border-(--border-soft) bg-white/80 p-5 text-left transition hover:border-(--branding-700) hover:bg-white dark:bg-neutral-950/50"
								>
									<div className="flex flex-wrap items-start justify-between gap-4">
										<div className="space-y-2">
											<p className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
												{trailer.trailer_code || trailer.vin || trailer.id}
											</p>
											<p className="text-sm text-neutral-600 dark:text-neutral-400">
												{formatTrailerType(trailer.trailer_type)} | {trailer.plate_number || "No plate"}
											</p>
											<p className="text-xs text-neutral-500 dark:text-neutral-400">
												{trailer.linkedRentals.length} linked rental(s)
											</p>
										</div>
										<div className="flex flex-wrap justify-end gap-2">
											<StatusBadge status={trailer.status} />
										</div>
									</div>
								</button>
							))}
						</div>
					) : (
						<EmptySection title="No Trailers Linked" message="No trailer assignments are connected to this account yet." />
					)}
				</div>
			) : null}
		</div>
	);
}
