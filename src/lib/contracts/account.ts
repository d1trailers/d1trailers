import { z } from "zod";

export const TENANT_ROLE_VALUES = ["account_owner", "account_user"] as const;
export const TENANT_PERMISSION_VALUES = [
	"view_rentals",
	"view_documents",
	"view_billing",
	"view_timeline",
	"manage_pickup",
	"manage_rentals",
	"manage_members",
] as const;

export type TenantRole = (typeof TENANT_ROLE_VALUES)[number];
export type TenantPermission = (typeof TENANT_PERMISSION_VALUES)[number];

export const tenantRoleSchema = z.enum(TENANT_ROLE_VALUES);
export const tenantPermissionSchema = z.enum(TENANT_PERMISSION_VALUES);

export const invitationCreateSchema = z.object({
	email: z.string().trim().email(),
	role: tenantRoleSchema,
	permissions: z.array(tenantPermissionSchema).default([]),
});

export const memberUpdateSchema = z.object({
	role: tenantRoleSchema.optional(),
	permissions: z.array(tenantPermissionSchema).optional(),
	isActive: z.boolean().optional(),
});

export const invitationUpdateSchema = z.object({
	action: z.enum(["revoke", "resend"]),
});

export const accountSwitchSchema = z.object({
	tenantId: z.string().uuid(),
});

export const CORE_ACCOUNT_USER_PERMISSIONS = TENANT_PERMISSION_VALUES.filter(
	(permission) => permission !== "manage_members"
);

export const PORTAL_SECTION_PERMISSIONS = [
	"view_rentals",
	"view_documents",
	"view_billing",
	"view_timeline",
	"manage_pickup",
] as const satisfies readonly TenantPermission[];

export const TENANT_PERMISSION_LABELS: Record<TenantPermission, string> = {
	view_rentals: "View rentals",
	view_documents: "View documents",
	view_billing: "View billing",
	view_timeline: "View timeline",
	manage_pickup: "Manage pickup",
	manage_rentals: "Manage rentals",
	manage_members: "Manage members",
};
