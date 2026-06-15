"use client";

import { usePathname } from "next/navigation";
import PortalFrame from "@/components/portal/PortalFrame";

const NAV_ITEMS = [
	{ id: "overview", label: "Overview", href: "/admin" },
	{ id: "management", label: "Management", href: "/admin/management" },
	{ id: "rentals", label: "Rentals", href: "/admin/rentals" },
	{ id: "billing", label: "Billing Watchlist", href: "/admin/watchlist" },
	{ id: "trailers", label: "Trailers", href: "/admin/trailers" },
];

export default function AdminShell({ adminEmail, children }) {
	const pathname = usePathname();
	const activeItemId =
		NAV_ITEMS.find(
			(item) =>
				pathname === item.href ||
				(item.href !== "/admin" && pathname.startsWith(item.href)),
		)?.id ?? "overview";

	return (
		<PortalFrame
			accountEyebrow="Portal"
			accountTitle="Admin"
			accountLines={[`Signed In As ${adminEmail}`]}
			navItems={NAV_ITEMS}
			activeItemId={activeItemId}
		>
			{children}
		</PortalFrame>
	);
}
