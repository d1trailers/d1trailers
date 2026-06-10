import {
	getApplicationSummaryCounts,
	listApplications,
	listApplicationsByTenantId,
	listRentalsByTenantId,
	listTimelineItemsByTenantId,
} from "@/lib/server/repos/platform";
import {
	hasTenantPermission,
	type UserContext,
} from "@/lib/server/services/access";

export async function getAdminSummary() {
	return getApplicationSummaryCounts();
}

export async function getAdminApplications() {
	return listApplications();
}

export async function getTenantTimeline(context: UserContext) {
	const membership = context.activeTenantMembership;
	const tenant = membership?.tenant;
	if (!tenant) {
		return {
			tenant: null,
			items: [],
			applications: [],
		};
	}

	const [items, applications] = await Promise.all([
		hasTenantPermission(membership, "view_timeline")
			? listTimelineItemsByTenantId(tenant.id)
			: Promise.resolve([]),
		listApplicationsByTenantId(tenant.id),
	]);

	return {
		tenant,
		items,
		applications,
	};
}

export async function getPortalSnapshot(context: UserContext) {
	const membership = context.activeTenantMembership;
	const tenant = membership?.tenant;
	if (!tenant) {
		return {
			tenant: null,
			rentals: [],
			timelineItems: [],
			applications: [],
		};
	}

	const [rentals, timelineItems, applications] = await Promise.all([
		hasTenantPermission(membership, "view_rentals")
			? listRentalsByTenantId(tenant.id)
			: Promise.resolve([]),
		hasTenantPermission(membership, "view_timeline")
			? listTimelineItemsByTenantId(tenant.id)
			: Promise.resolve([]),
		hasTenantPermission(membership, "view_documents")
			? listApplicationsByTenantId(tenant.id)
			: Promise.resolve([]),
	]);

	return {
		tenant,
		rentals,
		timelineItems,
		applications,
	};
}
