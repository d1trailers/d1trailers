"use client";

import AccountSwitcher from "@/components/account/AccountSwitcher";
import PortalFrame from "@/components/portal/PortalFrame";

export default function TenantShell({
	navItems = [],
	activeSection = "",
	accountContext,
	contextEmail,
	children,
}) {
	return (
		<PortalFrame
			accountEyebrow="Portal"
			accountTitle={accountContext.activeTenant?.name || "Tenant"}
			accountLines={[`Signed In As ${contextEmail}`]}
			navItems={navItems}
			activeItemId={activeSection}
			sidebarFooter={
				<AccountSwitcher
					memberships={accountContext.memberships}
					activeTenantId={accountContext.activeTenantId}
				/>
			}
		>
			{children}
		</PortalFrame>
	);
}
