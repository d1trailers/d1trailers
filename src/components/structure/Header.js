"use client";

import { useState, useEffect } from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Favicon from "./Favicon";

export default function Header() {
	const pathname = usePathname();
	const [active, setActive] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const onHomeHero = pathname === "/" && !active && !expanded;

	useEffect(() => {
		const handleScrollEvent = () => setActive(window.scrollY > 8);
		window.addEventListener("scroll", handleScrollEvent);
		handleScrollEvent();
		return () => window.removeEventListener("scroll", handleScrollEvent);
	}, []);

	return (
		<header className="fixed inset-x-0 top-0 z-50 p-3 md:px-6 lg:px-10">
			<div
				className={`surface-panel rounded-2xl transition-all duration-300 ${
					onHomeHero
						? "!bg-transparent !border-transparent !shadow-none backdrop-blur-0"
						: active || expanded
							? "border-(--branding-300)"
							: "bg-white/70 dark:bg-neutral-900/65"
				}`}
			>
				<section className="flex w-full h-20 items-center justify-between px-4 md:px-6">
					<Favicon />
					<nav className="hidden md:flex items-center gap-2">
						<HeaderNavigator pathname={pathname} onHero={onHomeHero} />
					</nav>
					<HeaderMenu
						expanded={expanded}
						setExpanded={setExpanded}
						onHero={onHomeHero}
					/>
				</section>
				<nav
					className={`md:hidden overflow-hidden transition-[max-height,opacity,padding] duration-300 ${
						expanded ? "max-h-72 opacity-100 pb-4" : "max-h-0 opacity-0 pb-0"
					}`}
					aria-hidden={!expanded}
				>
					<div className="px-4 flex flex-col gap-2">
						<HeaderNavigator
							pathname={pathname}
							onHero={onHomeHero}
							onNavigate={() => setExpanded(false)}
						/>
					</div>
				</nav>
			</div>
		</header>
	);
}

function HeaderMenu({ expanded, setExpanded, onHero }) {
	return (
		<button
			onClick={() => setExpanded((value) => !value)}
			className={`block md:hidden rounded-lg p-2 ${
				onHero
					? "border border-neutral-100/35 bg-neutral-900/20 text-neutral-50"
					: "surface-subtle"
			}`}
			aria-expanded={expanded}
			aria-label={expanded ? "Close menu" : "Open menu"}
		>
			{expanded ? (
				<XMarkIcon className="w-5 h-5" aria-hidden="true" />
			) : (
				<Bars3Icon className="w-5 h-5" aria-hidden="true" />
			)}
		</button>
	);
}

function HeaderNavigator({ pathname, onHero = false, onNavigate }) {
	const menuItems = [
		{ label: "Home", href: "/" },
		{ label: "Apply", href: "/apply" },
		{ label: "Policy", href: "/policy" },
		{ label: "Portal", href: "/login" },
	];

	return (
		<>
			{menuItems.map(({ label, href }) => {
				const active = pathname === href;
				return (
					<HeaderItem
						key={label}
						href={href}
						label={label}
						active={active}
						onHero={onHero}
						onNavigate={onNavigate}
					/>
				);
			})}
		</>
	);
}

function HeaderItem({ label, href, active, onHero, onNavigate }) {
	return (
		<Link
			href={href}
			onClick={onNavigate}
			className={`no-underline! block rounded-lg px-3 py-2 text-sm md:text-base font-syne font-semibold transition-colors hover:no-underline ${
				onHero
					? active
						? "bg-neutral-50/20 text-neutral-50"
						: "text-neutral-50 hover:bg-neutral-50/12"
					: active
						? "bg-(--branding-700) text-neutral-50"
						: "text-neutral-900 dark:text-neutral-50 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80"
			}`}
		>
			{label}
		</Link>
	);
}
