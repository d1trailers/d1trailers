import Link from "next/link";
import { redirect } from "next/navigation";
import Card from "@/components/ui/Card";
import LogoutButton from "@/components/auth/LogoutButton";
import AccountSwitcher from "@/components/account/AccountSwitcher";
import { buildAccountContextPayload } from "@/lib/server/services/accounts";
import {
	getCurrentUserContext,
	isStaffContext,
} from "@/lib/server/services/access";

const SCOPE_COPY = {
	portal: "This account does not currently grant you access to the active portal surface.",
	timeline:
		"This account does not currently grant you access to the applicant timeline surface.",
	manage_members:
		"This account does not currently grant you member-management access.",
	account_access:
		"Your login is valid, but it is not attached to any active account access yet.",
};

export default async function UnauthorizedPage({ searchParams }) {
	const context = await getCurrentUserContext();

	if (!context) {
		redirect("/login");
	}

	if (isStaffContext(context)) {
		redirect("/admin");
	}

	const params = await searchParams;
	const scope = typeof params?.scope === "string" ? params.scope : "account_access";
	const accountContext = buildAccountContextPayload(context);

	return (
		<div className="grid grid-flow-row w-full h-full gap-6 mt-25 p-5 md:px-12 lg:px-20 pb-12 motion-enter">
			<Card className="gap-4">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="text-xs uppercase tracking-[0.14em] text-neutral-600 dark:text-neutral-400">
							Access Required
						</p>
						<h1 className="font-syne text-3xl md:text-4xl font-bold text-neutral-950 dark:text-neutral-50">
							This account needs different access
						</h1>
						<p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
							{SCOPE_COPY[scope] || SCOPE_COPY.account_access}
						</p>
					</div>
					<LogoutButton className="rounded-xl border border-(--border-soft) px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-900" />
				</div>
				<p className="text-sm text-neutral-600 dark:text-neutral-400">
					If you believe you should have access here, ask your account owner to review your permissions or switch to another account you already belong to.
				</p>
				<div className="flex flex-wrap gap-3">
					<Link
						href="/login"
						className="rounded-xl bg-(--branding-700) px-4 py-3 text-sm font-semibold text-neutral-50 transition hover:bg-(--branding-800)"
					>
						Request Another Link
					</Link>
				</div>
			</Card>

			<AccountSwitcher
				memberships={accountContext.memberships}
				activeTenantId={accountContext.activeTenantId}
			/>
		</div>
	);
}
