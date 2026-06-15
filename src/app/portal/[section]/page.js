import TenantPortalSurface from "@/components/tenant/TenantPortalSurface";

export default async function PortalSectionPage({ params }) {
	const resolvedParams = await params;
	const section =
		typeof resolvedParams?.section === "string"
			? resolvedParams.section
			: "overview";

	return <TenantPortalSurface surface="portal" section={section} />;
}
