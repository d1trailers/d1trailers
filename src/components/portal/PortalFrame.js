"use client";

import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";

export default function PortalFrame({
	accountEyebrow,
	accountTitle,
	accountLines = [],
	navItems = [],
	activeItemId = "",
	sidebarFooter = null,
	children,
}) {
	return (
		<div className="w-full min-h-screen mt-25 p-5 md:px-10 lg:px-14 pb-10 motion-enter">
			<div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
				<aside className="surface-panel rounded-2xl p-5 h-fit">
					<div className="space-y-2">
						<p className="text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
							{accountEyebrow}
						</p>
						<p className="font-syne text-3xl font-bold text-neutral-950 dark:text-neutral-50 break-words">
							{accountTitle}
						</p>
						{accountLines.length ? (
							<div className="space-y-1">
								{accountLines.map((line) => (
									<p
										key={line}
										className="text-sm text-neutral-600 dark:text-neutral-400 break-all"
									>
										{line}
									</p>
								))}
							</div>
						) : null}
					</div>

					<nav className="mt-6 flex flex-col gap-2">
						{navItems.map((item) => (
							<Link
								key={item.id}
								href={item.href}
								className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors no-underline! hover:no-underline ${
									activeItemId === item.id
										? "bg-(--branding-700) text-neutral-50"
										: "surface-subtle text-neutral-800 dark:text-neutral-100"
								}`}
							>
								{item.label}
							</Link>
						))}
						<LogoutButton className="w-full text-left rounded-lg border border-(--border-soft) px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900" />
					</nav>

					{sidebarFooter ? <div className="mt-6">{sidebarFooter}</div> : null}
				</aside>

				<section className="space-y-5">{children}</section>
			</div>
		</div>
	);
}
