"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
	{ label: "Overview", href: "/admin" },
	{ label: "Applications", href: "/admin/applications" },
	{ label: "Active Rentals", href: "/admin/rentals" },
	{ label: "Billing Watchlist", href: "/admin/watchlist" },
	{ label: "Trailer Inventory", href: "/admin/inventory" },
];

export default function AdminShell({ adminEmail, children }) {
	const pathname = usePathname();

	return (
		<div className="w-full min-h-screen mt-25 p-5 md:px-10 lg:px-14">
			<div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
				<aside className="bg-neutral-200 dark:bg-neutral-800 rounded-2xl p-5 h-fit shadow-sm">
					<p className="text-sm text-neutral-600 dark:text-neutral-400">Admin</p>
					<p className="font-semibold text-neutral-950 dark:text-neutral-50 break-all">
						{adminEmail}
					</p>
					<nav className="mt-5 flex flex-col gap-2">
						{NAV_ITEMS.map((item) => {
							const active =
								pathname === item.href ||
								(item.href !== "/admin" && pathname.startsWith(item.href));
							return (
								<Link
									key={item.href}
									href={item.href}
									className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
										active
											? "bg-(--branding-700) text-neutral-50"
											: "bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100"
									}`}
								>
									{item.label}
								</Link>
							);
						})}
					</nav>
				</aside>

				<section className="space-y-5">
					<header className="bg-neutral-200 dark:bg-neutral-800 rounded-2xl p-5 shadow-sm">
						<h1 className="font-syne text-2xl md:text-3xl font-bold text-neutral-950 dark:text-neutral-50">
							Owner Dashboard
						</h1>
					</header>
					{children}
				</section>
			</div>
		</div>
	);
}
