import { redirect } from "next/navigation";
import Card from "@/components/ui/Card";
import LogoutButton from "@/components/auth/LogoutButton";
import AccountSwitcher from "@/components/account/AccountSwitcher";
import AccountUsersManager from "@/components/account/AccountUsersManager";
import {
	buildAccountContextPayload,
	listAccountMembers,
} from "@/lib/server/services/accounts";
import {
	canManageMembers,
	getCurrentUserContext,
	isStaffContext,
} from "@/lib/server/services/access";

export default async function AccountUsersPage() {
	const context = await getCurrentUserContext();

	if (!context) {
		redirect("/login");
	}

	if (isStaffContext(context)) {
		redirect("/admin");
	}

	if (!canManageMembers(context.activeTenantMembership)) {
		redirect("/unauthorized?scope=manage_members");
	}

	const [accountContext, membersData] = await Promise.all([
		buildAccountContextPayload(context),
		listAccountMembers(context),
	]);

	return (
		<div className="grid grid-flow-row w-full h-full gap-6 mt-25 p-5 md:px-12 lg:px-20 pb-12 motion-enter">
			<Card className="gap-4">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="text-xs uppercase tracking-[0.14em] text-neutral-600 dark:text-neutral-400">
							Account Management
						</p>
						<h1 className="font-syne text-3xl md:text-4xl font-bold text-neutral-950 dark:text-neutral-50">
							Manage Users
						</h1>
						<p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
							Signed in as {context.email}
						</p>
					</div>
					<LogoutButton className="rounded-xl border border-(--border-soft) px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-900" />
				</div>
				<p className="text-sm text-neutral-600 dark:text-neutral-400">
					Keep tenant access explicit. Owners can delegate safely, and delegated managers can only operate within the permissions granted to them.
				</p>
			</Card>

			<AccountSwitcher
				memberships={accountContext.memberships}
				activeTenantId={accountContext.activeTenantId}
				showManageLink={false}
			/>

			<AccountUsersManager initialData={membersData} />
		</div>
	);
}
