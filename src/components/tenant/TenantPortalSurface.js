import { redirect } from "next/navigation";
import TenantShell from "@/components/tenant/TenantShell";
import TenantWorkspace from "@/components/tenant/TenantWorkspace";
import {
	buildAccountContextPayload,
	listAccountMembers,
} from "@/lib/server/services/accounts";
import {
	canAccessPortal,
	canAccessTimeline,
	canManageMembers,
	canManageRentals,
	getCurrentUserContext,
	hasTenantPermission,
	isStaffContext,
} from "@/lib/server/services/access";
import { getTenantAccountWorkspace } from "@/lib/server/services/dashboard";

const TENANT_SECTIONS = new Set(["overview", "rentals", "billing", "users"]);

export default async function TenantPortalSurface({
	surface = "portal",
	section = "overview",
}) {
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

	if (surface === "timeline") {
		redirect(`/portal/${TENANT_SECTIONS.has(section) ? section : "overview"}`);
	}

	if (!canAccessPortal(membership) && !canAccessTimeline(membership)) {
		redirect("/unauthorized?scope=timeline");
	}

	const canViewRentals = hasTenantPermission(membership, "view_rentals");
	const canViewBilling = hasTenantPermission(membership, "view_billing");
	const canViewTimeline = hasTenantPermission(membership, "view_timeline");
	const canViewDocuments = hasTenantPermission(membership, "view_documents");
	const canManageAccountRentals = canManageRentals(membership);
	const canManageAccountMembers = canManageMembers(membership);
	const basePath = "/portal";
	const activeSection = TENANT_SECTIONS.has(section) ? section : "overview";
	const canSeeRentals = canViewRentals || canManageAccountRentals;

	if (activeSection === "rentals" && !canSeeRentals) {
		redirect("/unauthorized?scope=portal");
	}

	if (activeSection === "billing" && !canViewBilling) {
		redirect("/unauthorized?scope=portal");
	}

	if (activeSection === "users" && !canManageAccountMembers) {
		redirect("/unauthorized?scope=manage_members");
	}

	const navItems = [
		{ id: "overview", label: "Overview", href: `${basePath}/overview` },
		canViewRentals || canManageAccountRentals
			? { id: "rentals", label: "Rentals", href: `${basePath}/rentals` }
			: null,
		canViewBilling
			? { id: "billing", label: "Billing", href: `${basePath}/billing` }
			: null,
		canManageAccountMembers
			? { id: "users", label: "Users", href: `${basePath}/users` }
			: null,
	].filter(Boolean);

	const [workspaceData, accountContext, membersData] = await Promise.all([
		getTenantAccountWorkspace(context),
		buildAccountContextPayload(context),
		canManageAccountMembers
			? listAccountMembers(context)
			: Promise.resolve(null),
	]);

	return (
		<TenantShell
			navItems={navItems}
			activeSection={activeSection}
			accountContext={accountContext}
			contextEmail={context.email}
		>
			<TenantWorkspace
				activeSection={activeSection}
				workspaceData={workspaceData}
				membersData={membersData}
				canViewRentals={canViewRentals}
				canViewBilling={canViewBilling}
				canViewTimeline={canViewTimeline}
				canViewDocuments={canViewDocuments}
				canManageRentals={canManageAccountRentals}
				canManageMembers={canManageAccountMembers}
			/>
		</TenantShell>
	);
}
