import { redirect } from "next/navigation";
import AccountSwitcher from "@/components/account/AccountSwitcher";
import LogoutButton from "@/components/auth/LogoutButton";
import Card from "@/components/ui/Card";
import { buildAccountContextPayload } from "@/lib/server/services/accounts";
import {
	getCurrentUserContext,
	isStaffContext,
	resolveTenantDestination,
} from "@/lib/server/services/access";

export default async function AccountSelectPage() {
	const context = await getCurrentUserContext();

	if (!context) {
		redirect("/login");
	}

	if (isStaffContext(context)) {
		redirect("/admin");
	}

	const accountContext = buildAccountContextPayload(context);

	if (accountContext.memberships.length <= 1) {
		redirect(resolveTenantDestination(context.activeTenantMembership));
	}

	return (
		<div className="grid min-h-screen w-full place-items-center px-5 py-28 motion-enter">
			<div className="w-full max-w-3xl space-y-4">
				<Card className="gap-4">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div className="space-y-2">
							<p className="text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
								Account Selection
							</p>
							<h1 className="font-syne text-3xl font-bold text-neutral-950 dark:text-neutral-50 md:text-4xl">
								Choose the account you want to open
							</h1>
							<p className="text-sm text-neutral-600 dark:text-neutral-400">
								This login belongs to multiple accounts. Select one to continue;
								you will stay in that account until your next login.
							</p>
						</div>
						<LogoutButton className="rounded-xl border border-(--border-soft) px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-900" />
					</div>
				</Card>

				<AccountSwitcher
					memberships={accountContext.memberships}
					activeTenantId={accountContext.activeTenantId}
					allowContinue
				/>
			</div>
		</div>
	);
}
