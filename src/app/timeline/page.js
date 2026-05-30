import { redirect } from "next/navigation";
import Card from "@/components/ui/Card";
import LogoutButton from "@/components/auth/LogoutButton";
import StatusBadge from "@/components/admin/StatusBadge";
import { getCurrentUserContext, isStaffContext } from "@/lib/server/services/access";
import { getTenantTimeline } from "@/lib/server/services/dashboard";

const ACTIVE_PORTAL_TENANT_STATUSES = new Set(["active", "past_due", "suspended"]);

function formatDate(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString();
}

export default async function TimelinePage() {
	const context = await getCurrentUserContext();

	if (!context) {
		redirect("/login");
	}

	if (isStaffContext(context)) {
		redirect("/admin");
	}

	const tenant = context.primaryTenantMembership?.tenant;
	if (!tenant) {
		redirect("/login");
	}

	if (ACTIVE_PORTAL_TENANT_STATUSES.has(tenant.status)) {
		redirect("/portal");
	}

	const data = await getTenantTimeline(context);

	return (
		<div className="grid grid-flow-row w-full h-full gap-6 mt-25 p-5 md:px-12 lg:px-20 pb-12 motion-enter">
			<Card className="gap-4">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="text-xs uppercase tracking-[0.14em] text-neutral-600 dark:text-neutral-400">Application Timeline</p>
						<h1 className="font-syne text-3xl md:text-4xl font-bold text-neutral-950 dark:text-neutral-50">{tenant.display_name}</h1>
						<p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Signed in as {context.email}</p>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<StatusBadge status={tenant.status} />
						<LogoutButton className="rounded-xl border border-(--border-soft) px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-900" />
					</div>
				</div>
				<p className="text-sm text-neutral-600 dark:text-neutral-400">This view keeps applicants and pending accounts informed about where things stand and what is still needed next.</p>
			</Card>

			<Card>
				<h2 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">Current Timeline</h2>
				{data.items.length ? (
					<div className="space-y-3">
						{data.items.map((item) => (
							<div key={item.id} className="surface-subtle rounded-2xl p-4 space-y-2">
								<div className="flex flex-wrap items-center justify-between gap-3">
									<p className="font-semibold text-neutral-950 dark:text-neutral-50">{item.title}</p>
									<StatusBadge status={item.type} />
								</div>
								{item.description ? <p className="text-sm text-neutral-600 dark:text-neutral-400">{item.description}</p> : null}
								<div className="flex flex-wrap gap-4 text-xs text-neutral-500 dark:text-neutral-400">
									<span>Created {formatDate(item.created_at)}</span>
									{item.due_at ? <span>Due {formatDate(item.due_at)}</span> : null}
									{item.completed_at ? <span>Completed {formatDate(item.completed_at)}</span> : null}
								</div>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-neutral-600 dark:text-neutral-400">We&apos;ll post timeline updates here as soon as your request moves forward.</p>
				)}
			</Card>

			<Card>
				<h2 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">Applications</h2>
				{data.applications.length ? (
					<div className="space-y-3">
						{data.applications.map((application) => (
							<div key={application.id} className="surface-subtle rounded-2xl p-4 space-y-2">
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div>
										<p className="font-semibold text-neutral-950 dark:text-neutral-50">{application.company_name}</p>
										<p className="text-sm text-neutral-600 dark:text-neutral-400">Submitted {formatDate(application.submitted_at)}</p>
									</div>
									<StatusBadge status={application.status} />
								</div>
								{application.documents?.length ? <p className="text-sm text-neutral-600 dark:text-neutral-400">{application.documents.length} document(s) on file</p> : null}
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-neutral-600 dark:text-neutral-400">No application records are attached to this account yet.</p>
				)}
			</Card>
		</div>
	);
}

