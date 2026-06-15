"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export default function SearchInput({
	value,
	onChange,
	placeholder = "Search",
	className = "",
}) {
	return (
		<div className={`relative flex-1 min-w-[260px] ${className}`.trim()}>
			<MagnifyingGlassIcon
				className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400"
				aria-hidden="true"
			/>
			<input
				type="search"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				className="w-full rounded-2xl border border-(--border-soft) bg-white px-12 py-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
			/>
		</div>
	);
}
