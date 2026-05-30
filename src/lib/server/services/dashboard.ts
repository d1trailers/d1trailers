import {
	getApplicationSummaryCounts,
	listApplications,
	listApplicationsByTenantId,
	listRentalsByTenantId,
	listTimelineItemsByTenantId,
} from "@/lib/server/repos/platform";
import type { UserContext } from "@/lib/server/services/access";

export async function getAdminSummary() {
	return getApplicationSummaryCounts();
}

export async function getAdminApplications() {
	return listApplications();
}

export async function getTenantTimeline(context: UserContext) {
	const tenant = context.primaryTenantMembership?.tenant;
	if (!tenant) {
		return {
			tenant: null,
			items: [],
			applications: [],
		};
	}

	const [items, applications] = await Promise.all([
		listTimelineItemsByTenantId(tenant.id),
		listApplicationsByTenantId(tenant.id),
	]);

	return {
		tenant,
		items,
		applications,
	};
}

export async function getPortalSnapshot(context: UserContext) {
	const tenant = context.primaryTenantMembership?.tenant;
	if (!tenant) {
		return {
			tenant: null,
			rentals: [],
			timelineItems: [],
			applications: [],
		};
	}

	const [rentals, timelineItems, applications] = await Promise.all([
		listRentalsByTenantId(tenant.id),
		listTimelineItemsByTenantId(tenant.id),
		listApplicationsByTenantId(tenant.id),
	]);

	return {
		tenant,
		rentals,
		timelineItems,
		applications,
	};
}
