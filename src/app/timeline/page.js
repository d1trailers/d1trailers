import Link from "next/link";
import { redirect } from "next/navigation";
import Card from "@/components/ui/Card";
import LogoutButton from "@/components/auth/LogoutButton";
import StatusBadge from "@/components/admin/StatusBadge";
import AccountSwitcher from "@/components/account/AccountSwitcher";
import { buildAccountContextPayload } from "@/lib/server/services/accounts";
import {
	canAccessTimeline,
	getCurrentUserContext,
	hasTenantPermission,
	isStaffContext,
} from "@/lib/server/services/access";
import { getTenantTimeline } from "@/lib/server/services/dashboard";

const ACTIVE_PORTAL_TENANT_STATUSES = new Set(["active", "past_due", "suspended"]);

function formatDate(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString();
}

function groupTimelineItems(items) {
	return {
		actionRequired: items.filter(
			(item) => item.stage === "current" && item.type === "action_required"
		),
		inProgress: items.filter(
			(item) => item.stage === "current" && item.type !== "action_required"
		),
		upcoming: items.filter((item) => item.stage === "upcoming"),
		completed: items.filter((item) => item.stage === "completed"),
	};
}

function ProgressCard({ title, value, caption }) {
	return (
		<div className="surface-subtle rounded-2xl p-4">
			<p className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
				{title}
			</p>
			<p className="mt-2 font-syne text-3xl font-bold text-neutral-950 dark:text-neutral-50">
				{value}
			</p>
			<p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{caption}</p>
		</div>
	);
}

function TimelineCard({ item, emphasize = false }) {
	return (
		<div
			className={`rounded-2xl p-4 space-y-3 border ${
				emphasize
					? "border-(--branding-700) bg-red-50/60 dark:bg-red-950/20"
					: "border-(--border-soft) bg-white/80 dark:bg-neutral-950/50"
			}`}
		>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="space-y-1">
					<p className="font-semibold text-neutral-950 dark:text-neutral-50">
						{item.title}
					</p>
					{item.description ? (
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							{item.description}
						</p>
					) : null}
				</div>
				<div className="flex flex-wrap gap-2">
					<StatusBadge status={item.stage} />
					<StatusBadge status={item.type} />
				</div>
			</div>
			<div className="flex flex-wrap gap-4 text-xs text-neutral-500 dark:text-neutral-400">
				<span>Posted {formatDate(item.created_at)}</span>
				{item.due_at ? <span>Due {formatDate(item.due_at)}</span> : null}
				{item.completed_at ? <span>Completed {formatDate(item.completed_at)}</span> : null}
			</div>
			{item.cta_url && item.cta_label ? (
				<Link
					href={item.cta_url}
					className="inline-flex rounded-xl bg-(--branding-700) px-4 py-3 text-sm font-semibold text-neutral-50 transition hover:bg-(--branding-800)"
				>
					{item.cta_label}
				</Link>
			) : null}
		</div>
	);
}

export default async function TimelinePage() {
	const context = await getCurrentUserContext();

	if (!context) {
		redirect("/login");
	}

	if (isStaffContext(context)) {
		redirect("/admin");
	}

	const membership = context.activeTenantMembership;
	const tenant = membership?.tenant;
	if (!tenant || !membership) {
		redirect("/unauthorized?scope=account_access");
	}

	if (ACTIVE_PORTAL_TENANT_STATUSES.has(tenant.status)) {
		redirect("/portal");
	}

	if (!canAccessTimeline(membership)) {
		redirect("/unauthorized?scope=timeline");
	}

	const [data, accountContext] = await Promise.all([
		getTenantTimeline(context),
		buildAccountContextPayload(context),
	]);
	const canViewDocuments = hasTenantPermission(membership, "view_documents");
	const groupedItems = groupTimelineItems(data.items);
	const visibleProgressItems = data.items.filter((item) => item.type !== "message");
	const completedCount = groupedItems.completed.length;
	const progressTotal = visibleProgressItems.length || 1;
	const progressPercent = Math.max(
		10,
		Math.min(100, Math.round((completedCount / progressTotal) * 100))
	);

	return (
		<div className="grid grid-flow-row w-full h-full gap-6 mt-25 p-5 md:px-12 lg:px-20 pb-12 motion-enter">
			<Card className="gap-4">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="text-xs uppercase tracking-[0.14em] text-neutral-600 dark:text-neutral-400">
							Application Timeline
						</p>
						<h1 className="font-syne text-3xl md:text-4xl font-bold text-neutral-950 dark:text-neutral-50">
							{tenant.display_name}
						</h1>
						<p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
							Signed in as {context.email}
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<StatusBadge status={tenant.status} />
						<LogoutButton className="rounded-xl border border-(--border-soft) px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-900" />
					</div>
				</div>
				<p className="text-sm text-neutral-600 dark:text-neutral-400">
					This space tracks where your application stands, what our team is working on, and anything still needed from you before the rental can move forward.
				</p>
			</Card>

			<AccountSwitcher
				memberships={accountContext.memberships}
				activeTenantId={accountContext.activeTenantId}
				showManageLink
			/>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
				<Card>
					<div className="space-y-3">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<h2 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
								Progress Overview
							</h2>
							<p className="text-sm text-neutral-600 dark:text-neutral-400">
								{completedCount} of {progressTotal} milestones complete
							</p>
						</div>
						<div className="h-3 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
							<div
								className="h-full rounded-full bg-(--branding-700) transition-all duration-500"
								style={{ width: `${progressPercent}%` }}
							/>
						</div>
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							We&apos;ll keep this timeline updated as your application moves from review into approval and pickup preparation.
						</p>
					</div>
				</Card>

				<ProgressCard
					title="Current Actions"
					value={groupedItems.actionRequired.length}
					caption="Steps currently waiting on you."
				/>
				<ProgressCard
					title="Upcoming Steps"
					value={groupedItems.upcoming.length}
					caption="Planned steps after the current work is complete."
				/>
			</div>

			<Card>
				<div className="space-y-3">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h2 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
							Action Required
						</h2>
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							{groupedItems.actionRequired.length} item(s)
						</p>
					</div>
					{groupedItems.actionRequired.length ? (
						<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
							{groupedItems.actionRequired.map((item) => (
								<TimelineCard key={item.id} item={item} emphasize />
							))}
						</div>
					) : (
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							There are no open action items for you right now.
						</p>
					)}
				</div>
			</Card>

			<div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
				<Card>
					<div className="space-y-3">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<h2 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
								In Progress
							</h2>
							<p className="text-sm text-neutral-600 dark:text-neutral-400">
								{groupedItems.inProgress.length} item(s)
							</p>
						</div>
						{groupedItems.inProgress.length ? (
							<div className="space-y-3">
								{groupedItems.inProgress.map((item) => (
									<TimelineCard key={item.id} item={item} />
								))}
							</div>
						) : (
							<p className="text-sm text-neutral-600 dark:text-neutral-400">
								Nothing is actively in progress on the tenant-facing timeline right now.
							</p>
						)}
					</div>
				</Card>

				<Card>
					<div className="space-y-3">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<h2 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
								Upcoming Steps
							</h2>
							<p className="text-sm text-neutral-600 dark:text-neutral-400">
								{groupedItems.upcoming.length} item(s)
							</p>
						</div>
						{groupedItems.upcoming.length ? (
							<div className="space-y-3">
								{groupedItems.upcoming.map((item) => (
									<TimelineCard key={item.id} item={item} />
								))}
							</div>
						) : (
							<p className="text-sm text-neutral-600 dark:text-neutral-400">
								Upcoming steps will appear here once your account reaches the next stage.
							</p>
						)}
					</div>
				</Card>
			</div>

			<Card>
				<div className="space-y-3">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h2 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
							Completed Steps
						</h2>
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							{groupedItems.completed.length} item(s)
						</p>
					</div>
					{groupedItems.completed.length ? (
						<div className="space-y-3">
							{groupedItems.completed.map((item) => (
								<TimelineCard key={item.id} item={item} />
							))}
						</div>
					) : (
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							Completed milestones will accumulate here as your timeline progresses.
						</p>
					)}
				</div>
			</Card>

			<Card>
				<div className="space-y-3">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h2 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
							Applications
						</h2>
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							{data.applications.length} record(s)
						</p>
					</div>
					{data.applications.length ? (
						<div className="space-y-3">
							{data.applications.map((application) => (
								<div
									key={application.id}
									className="surface-subtle rounded-2xl p-4 space-y-2"
								>
									<div className="flex flex-wrap items-center justify-between gap-3">
										<div>
											<p className="font-semibold text-neutral-950 dark:text-neutral-50">
												{application.company_name}
											</p>
											<p className="text-sm text-neutral-600 dark:text-neutral-400">
												Submitted {formatDate(application.submitted_at)}
											</p>
										</div>
										<StatusBadge status={application.status} />
									</div>
									{canViewDocuments && application.documents?.length ? (
										<p className="text-sm text-neutral-600 dark:text-neutral-400">
											{application.documents.length} document(s) on file
										</p>
									) : null}
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							No application records are attached to this account yet.
						</p>
					)}
				</div>
			</Card>
		</div>
	);
}
