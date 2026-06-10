import { redirect } from "next/navigation";
import Card from "@/components/ui/Card";
import LogoutButton from "@/components/auth/LogoutButton";
import StatusBadge from "@/components/admin/StatusBadge";
import PortalBillingActions from "@/components/portal/PortalBillingActions";
import AccountSwitcher from "@/components/account/AccountSwitcher";
import { buildAccountContextPayload } from "@/lib/server/services/accounts";
import {
	canAccessPortal,
	getCurrentUserContext,
	hasTenantPermission,
	isStaffContext,
} from "@/lib/server/services/access";
import { getPortalSnapshot } from "@/lib/server/services/dashboard";

const ACTIVE_PORTAL_TENANT_STATUSES = new Set(["active", "past_due", "suspended"]);

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

export default async function PortalPage() {
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

	if (!ACTIVE_PORTAL_TENANT_STATUSES.has(tenant.status)) {
		redirect("/timeline");
	}

	if (!canAccessPortal(membership)) {
		redirect("/unauthorized?scope=portal");
	}

	const [snapshot, accountContext] = await Promise.all([
		getPortalSnapshot(context),
		buildAccountContextPayload(context),
	]);

	const canViewBilling = hasTenantPermission(membership, "view_billing");
	const canViewRentals = hasTenantPermission(membership, "view_rentals");
	const canViewTimeline = hasTenantPermission(membership, "view_timeline");
	const canViewDocuments = hasTenantPermission(membership, "view_documents");
	const documents = snapshot.applications.flatMap((application) =>
		application.documents?.map((document) => ({
			...document,
			applicationId: application.id,
		})) ?? []
	);

	return (
		<div className="grid grid-flow-row w-full h-full gap-6 mt-25 p-5 md:px-12 lg:px-20 pb-12 motion-enter">
			<Card className="gap-4">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="text-xs uppercase tracking-[0.14em] text-neutral-600 dark:text-neutral-400">
							Tenant Portal
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
			</Card>

			<AccountSwitcher
				memberships={accountContext.memberships}
				activeTenantId={accountContext.activeTenantId}
				showManageLink
			/>

			{canViewBilling ? (
				<Card>
					<h2 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
						Billing Actions
					</h2>
					<p className="text-sm text-neutral-600 dark:text-neutral-400">
						Billing actions are already wired to the new platform. Live Stripe actions remain intentionally disabled until your key is ready.
					</p>
					<PortalBillingActions rentalId={snapshot.rentals?.[0]?.id || ""} />
				</Card>
			) : null}

			<div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
				{canViewRentals ? (
					<Card>
						<div className="flex items-center justify-between gap-3">
							<h2 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
								Rentals
							</h2>
							<p className="text-sm text-neutral-600 dark:text-neutral-400">
								{snapshot.rentals.length} record(s)
							</p>
						</div>
						{snapshot.rentals.length ? (
							<div className="space-y-4">
								{snapshot.rentals.map((rental) => (
									<div key={rental.id} className="surface-subtle rounded-2xl p-4 space-y-3">
										<div className="flex flex-wrap items-center justify-between gap-3">
											<div>
												<p className="font-semibold text-neutral-950 dark:text-neutral-50">
													Rental {rental.id.slice(0, 8)}
												</p>
												<p className="text-sm text-neutral-600 dark:text-neutral-400">
													Billing frequency: {rental.billing_frequency || "-"}
												</p>
											</div>
											<div className="flex flex-wrap gap-2">
												<StatusBadge status={rental.status} />
												{rental.billing_status ? (
													<StatusBadge status={rental.billing_status} />
												) : null}
											</div>
										</div>
										<div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
											<div className="surface-panel rounded-xl p-3">
												<p className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
													Rate
												</p>
												<p className="mt-1 text-neutral-900 dark:text-neutral-100">
													{formatCurrency(rental.rate)}
												</p>
											</div>
											<div className="surface-panel rounded-xl p-3">
												<p className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
													Deposit
												</p>
												<p className="mt-1 text-neutral-900 dark:text-neutral-100">
													{formatCurrency(rental.deposit_amount)}
												</p>
											</div>
											<div className="surface-panel rounded-xl p-3">
												<p className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
													Start Date
												</p>
												<p className="mt-1 text-neutral-900 dark:text-neutral-100">
													{formatDate(rental.contract_start_date)}
												</p>
											</div>
											<div className="surface-panel rounded-xl p-3">
												<p className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
													End Date
												</p>
												<p className="mt-1 text-neutral-900 dark:text-neutral-100">
													{formatDate(rental.end_date)}
												</p>
											</div>
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-neutral-600 dark:text-neutral-400">
								No active rental records are on this tenant yet.
							</p>
						)}
					</Card>
				) : (
					<Card>
						<h2 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
							Rentals
						</h2>
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							This account user does not currently have rental visibility.
						</p>
					</Card>
				)}

				{canViewTimeline ? (
					<Card>
						<div className="flex items-center justify-between gap-3">
							<h2 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
								Recent Timeline
							</h2>
							<p className="text-sm text-neutral-600 dark:text-neutral-400">
								{snapshot.timelineItems.length} item(s)
							</p>
						</div>
						{snapshot.timelineItems.length ? (
							<div className="space-y-3">
								{snapshot.timelineItems.map((item) => (
									<div key={item.id} className="surface-subtle rounded-2xl p-4">
										<div className="flex flex-wrap items-center justify-between gap-3">
											<p className="font-semibold text-neutral-950 dark:text-neutral-50">
												{item.title}
											</p>
											<StatusBadge status={item.type} />
										</div>
										{item.description ? (
											<p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
												{item.description}
											</p>
										) : null}
										<p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
											Created {formatDate(item.created_at)}
										</p>
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-neutral-600 dark:text-neutral-400">
								Timeline updates will appear here as your account progresses.
							</p>
						)}
					</Card>
				) : (
					<Card>
						<h2 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
							Recent Timeline
						</h2>
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							Timeline visibility has not been delegated on this account.
						</p>
					</Card>
				)}
			</div>

			{canViewDocuments ? (
				<Card>
					<div className="flex items-center justify-between gap-3">
						<h2 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
							Documents
						</h2>
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							{documents.length} file(s)
						</p>
					</div>
					{documents.length ? (
						<div className="space-y-3">
							{documents.map((document) => (
								<div
									key={document.id}
									className="surface-subtle rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3"
								>
									<div>
										<p className="font-semibold text-neutral-950 dark:text-neutral-50">
											{document.file_name}
										</p>
										<p className="text-sm text-neutral-600 dark:text-neutral-400">
											{document.document_type} • Application{" "}
											{document.applicationId.slice(0, 8)}
										</p>
									</div>
									{document.signed_url ? (
										<a
											href={document.signed_url}
											target="_blank"
											rel="noreferrer"
											className="rounded-xl border border-(--border-soft) px-4 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-900"
										>
											Open Document
										</a>
									) : null}
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							No documents are currently available for this account.
						</p>
					)}
				</Card>
			) : null}
		</div>
	);
}
