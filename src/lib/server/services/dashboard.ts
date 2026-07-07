import {
	getApplicationSummaryCounts,
	getTenantById,
	listApplications,
	listApplicationsByTenantIds,
	listCommunicationEventsByTenantId,
	listCommunicationEventsByTenantIds,
	listDetailedApplicationsByTenantId,
	listApplicationsByTenantId,
	listRentalsByTenantId,
	listRentalsByTenantIds,
	listTenants,
	listTimelineItemsByTenantId,
	listTimelineItemsByTenantIds,
} from "@/lib/server/repos/platform";
import {
	hasTenantPermission,
	type UserContext,
} from "@/lib/server/services/access";

const ADMIN_MANAGEMENT_GROUPS = {
	active: new Set(["active"]),
	suspended: new Set(["suspended"]),
	stale: new Set(["stale"]),
} as const;

function getManagementGroup(status: string) {
	if (ADMIN_MANAGEMENT_GROUPS.active.has(status as never)) return "active";
	if (ADMIN_MANAGEMENT_GROUPS.suspended.has(status as never)) return "suspended";
	if (ADMIN_MANAGEMENT_GROUPS.stale.has(status as never)) return "stale";
	return "other";
}

export async function getAdminSummary() {
	return getApplicationSummaryCounts();
}

export async function getAdminApplications() {
	return listApplications();
}

export async function getAdminManagementTenants() {
	const tenants = await listTenants();
	const tenantIds = tenants.map((tenant) => tenant.id);

	const [applications, communications, rentals, timelineItems] = await Promise.all([
		listApplicationsByTenantIds(tenantIds),
		listCommunicationEventsByTenantIds(tenantIds),
		listRentalsByTenantIds(tenantIds),
		listTimelineItemsByTenantIds(tenantIds),
	]);

	const applicationsByTenantId = new Map<string, typeof applications>();
	for (const application of applications) {
		const current = applicationsByTenantId.get(application.tenant_id) ?? [];
		current.push(application);
		applicationsByTenantId.set(application.tenant_id, current);
	}

	const communicationsByTenantId = new Map<string, typeof communications>();
	for (const communication of communications) {
		if (!communication.tenant_id) continue;
		const current = communicationsByTenantId.get(communication.tenant_id) ?? [];
		current.push(communication);
		communicationsByTenantId.set(communication.tenant_id, current);
	}

	const rentalsByTenantId = new Map<string, typeof rentals>();
	for (const rental of rentals) {
		const current = rentalsByTenantId.get(rental.tenant_id) ?? [];
		current.push(rental);
		rentalsByTenantId.set(rental.tenant_id, current);
	}

	const timelineByTenantId = new Map<string, typeof timelineItems>();
	for (const item of timelineItems) {
		const current = timelineByTenantId.get(item.tenant_id) ?? [];
		current.push(item);
		timelineByTenantId.set(item.tenant_id, current);
	}

	return tenants.map((tenant) => {
		const tenantApplications = applicationsByTenantId.get(tenant.id) ?? [];
		const latestApplication = tenantApplications[0] ?? null;
		const tenantCommunications = communicationsByTenantId.get(tenant.id) ?? [];
		const tenantRentals = rentalsByTenantId.get(tenant.id) ?? [];
		const tenantTimeline = timelineByTenantId.get(tenant.id) ?? [];

		return {
			id: tenant.id,
			displayName: tenant.display_name,
			primaryEmail: tenant.primary_email,
			primaryPhone: tenant.primary_phone,
			status: tenant.status,
			createdAt: tenant.created_at,
			updatedAt: tenant.updated_at,
			group: getManagementGroup(tenant.status),
			latestApplication: latestApplication
				? {
						id: latestApplication.id,
						status: latestApplication.status,
						submittedAt: latestApplication.submitted_at,
						companyName: latestApplication.company_name,
				  }
				: null,
			applicationCount: tenantApplications.length,
			rentalCount: tenantRentals.length,
			communicationCount: tenantCommunications.length,
			lastCommunicationAt: tenantCommunications[0]?.created_at ?? null,
			pendingTimelineCount: tenantTimeline.filter(
				(item) =>
					item.visible_to_tenant &&
					item.stage !== "completed" &&
					item.type === "action_required",
			).length +
				tenantRentals.filter((rental) => rental.status === "customer_review").length,
		};
	});
}

export async function getAdminTenantManagementDetail(tenantId: string) {
	const tenant = await getTenantById(tenantId);
	if (!tenant) {
		return null;
	}

	const [applications, communications, rentals, timelineItems] = await Promise.all([
		listDetailedApplicationsByTenantId(tenantId),
		listCommunicationEventsByTenantId(tenantId),
		listRentalsByTenantId(tenantId),
		listTimelineItemsByTenantId(tenantId),
	]);

	return {
		tenant,
		applications,
		currentApplication: applications[0] ?? null,
		communications,
		rentals,
		timelineItems,
	};
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

export async function getTenantAccountWorkspace(context: UserContext) {
	const membership = context.activeTenantMembership;
	const tenant = membership?.tenant;
	if (!tenant) {
		return {
			tenant: null,
			rentals: [],
			timelineItems: [],
			communications: [],
		};
	}

	const [rentals, timelineItems, communications] = await Promise.all([
		hasTenantPermission(membership, "view_rentals") ||
		hasTenantPermission(membership, "manage_rentals") ||
		hasTenantPermission(membership, "view_billing")
			? listRentalsByTenantId(tenant.id)
			: Promise.resolve([]),
		hasTenantPermission(membership, "view_timeline")
			? listTimelineItemsByTenantId(tenant.id)
			: Promise.resolve([]),
		hasTenantPermission(membership, "view_timeline")
			? listCommunicationEventsByTenantId(tenant.id)
			: Promise.resolve([]),
	]);

	return {
		tenant,
		rentals,
		timelineItems,
		communications,
	};
}
