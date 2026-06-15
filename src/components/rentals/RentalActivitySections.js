"use client";

import {
	ChatBubbleLeftRightIcon,
	ClockIcon,
	ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/admin/StatusBadge";
import PortalBillingActions from "@/components/portal/PortalBillingActions";
import {
	EmptyDetailState,
	formatRentalDate,
	formatRentalDateTime,
	formatRentalLabel,
	RentalMetricTile,
} from "@/components/rentals/RentalDetailShared";

function TimelineList({ title, items, emptyMessage, emphasize = false }) {
	return (
		<Card>
			<div className="space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
						{title}
					</h3>
					<p className="text-sm text-neutral-600 dark:text-neutral-400">
						{items.length} item(s)
					</p>
				</div>
				{items.length ? (
					<div className="space-y-3">
						{items.map((item) => (
							<div
								key={item.id}
								className={`rounded-2xl border p-4 ${
									emphasize
										? "border-red-200 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/20"
										: "border-(--border-soft) bg-white/80 dark:bg-neutral-950/50"
								}`}
							>
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div>
										<p className="font-semibold text-neutral-950 dark:text-neutral-50">
											{item.title}
										</p>
										{item.description ? (
											<p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
												{item.description}
											</p>
										) : null}
									</div>
									<div className="flex flex-wrap gap-2">
										<StatusBadge status={item.stage} />
										<StatusBadge status={item.type} />
									</div>
								</div>
								<div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-500 dark:text-neutral-400">
									<span>Created {formatRentalDateTime(item.createdAt)}</span>
									{item.dueAt ? <span>Due {formatRentalDateTime(item.dueAt)}</span> : null}
									{item.completedAt ? (
										<span>Completed {formatRentalDateTime(item.completedAt)}</span>
									) : null}
								</div>
							</div>
						))}
					</div>
				) : (
					<EmptyDetailState title={title} message={emptyMessage} />
				)}
			</div>
		</Card>
	);
}

export function RentalTimelineGrid({
	timeline = {
		actionRequired: [],
		inProgress: [],
		upcoming: [],
		completed: [],
	},
}) {
	return (
		<>
			<div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
				<TimelineList
					title="Action Required"
					items={timeline.actionRequired}
					emptyMessage="There are no current action items tied to this rental."
					emphasize
				/>
				<TimelineList
					title="In Progress"
					items={timeline.inProgress}
					emptyMessage="Nothing is actively in progress for this rental."
				/>
			</div>
			<div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
				<TimelineList
					title="Upcoming Steps"
					items={timeline.upcoming}
					emptyMessage="No upcoming steps are attached to this rental."
				/>
				<TimelineList
					title="Completed Steps"
					items={timeline.completed}
					emptyMessage="No completed steps are attached to this rental."
				/>
			</div>
		</>
	);
}

export function RentalCommunicationsCard({
	communications = [],
	title = "Communication Updates",
	emptyTitle = "No Communication Updates",
	emptyMessage = "No communication updates are attached to this rental.",
}) {
	return (
		<Card>
			<div className="space-y-3">
				<div className="flex items-center gap-3">
					<ChatBubbleLeftRightIcon className="h-6 w-6 text-(--branding-700)" aria-hidden="true" />
					<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
						{title}
					</h3>
				</div>
				{communications.length ? (
					<div className="space-y-3">
						{communications.map((communication) => (
							<div key={communication.id} className="surface-subtle rounded-2xl p-4">
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div>
										<p className="font-semibold text-neutral-950 dark:text-neutral-50">
											{communication.subject || formatRentalLabel(communication.type)}
										</p>
										<p className="text-sm text-neutral-600 dark:text-neutral-400">
											{communication.recipientEmail}
										</p>
									</div>
									<div className="flex flex-wrap gap-2">
										<StatusBadge status={communication.type} />
										<StatusBadge status={communication.status} />
									</div>
								</div>
								<div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-500 dark:text-neutral-400">
									<span>Created {formatRentalDateTime(communication.createdAt)}</span>
									{communication.sentAt ? (
										<span>Sent {formatRentalDateTime(communication.sentAt)}</span>
									) : null}
								</div>
							</div>
						))}
					</div>
				) : (
					<EmptyDetailState title={emptyTitle} message={emptyMessage} />
				)}
			</div>
		</Card>
	);
}

export function RentalSnapshotCard({ rental }) {
	return (
		<Card>
			<div className="space-y-3">
				<div className="flex items-center gap-3">
					<ClockIcon className="h-6 w-6 text-(--branding-700)" aria-hidden="true" />
					<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
						Rental Snapshot
					</h3>
				</div>
				<div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
					<p>
						Requested trailer type:{" "}
						<span className="font-medium text-neutral-900 dark:text-neutral-100">
							{rental.requestedTrailerType || "-"}
						</span>
					</p>
					<p>
						Requested trailer count:{" "}
						<span className="font-medium text-neutral-900 dark:text-neutral-100">
							{rental.requestedTrailerCount || "-"}
						</span>
					</p>
					<p>
						Current period end:{" "}
						<span className="font-medium text-neutral-900 dark:text-neutral-100">
							{formatRentalDate(rental.currentPeriodEnd, { dateStyle: "medium" })}
						</span>
					</p>
					<p>
						Summary:{" "}
						<span className="font-medium text-neutral-900 dark:text-neutral-100">
							{rental.requestSummary || "-"}
						</span>
					</p>
				</div>
			</div>
		</Card>
	);
}

export function RentalBillingCard({
	rental,
	enableActions = false,
	inactiveMessage = "Billing actions are unavailable for this rental.",
}) {
	const isLiveBillingRental = ["active", "past_due", "suspended"].includes(
		rental?.status,
	);

	return (
		<Card>
			<div className="space-y-3">
				<div className="flex items-center gap-3">
					<ExclamationTriangleIcon className="h-6 w-6 text-(--branding-700)" aria-hidden="true" />
					<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
						Billing
					</h3>
				</div>
				<div className="grid gap-4 md:grid-cols-3">
					<RentalMetricTile
						label="Billing Status"
						value={formatRentalLabel(rental.billingStatus)}
					/>
					<RentalMetricTile
						label="Current Period End"
						value={formatRentalDate(rental.currentPeriodEnd, { dateStyle: "medium" })}
					/>
					<RentalMetricTile label="Last Invoice" value={rental.lastInvoiceId || "-"} />
				</div>
				{enableActions ? (
					isLiveBillingRental ? (
						<PortalBillingActions rentalId={rental.id} />
					) : (
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							{inactiveMessage}
						</p>
					)
				) : null}
			</div>
		</Card>
	);
}
