"use client";

export default function ActionButton({
	children,
	tone = "primary",
	className = "",
	...props
}) {
	const tones = {
		primary: "bg-(--branding-700) text-neutral-50 hover:bg-(--branding-800)",
		positive: "bg-emerald-600 text-white hover:bg-emerald-700",
		neutral:
			"border border-(--border-soft) text-neutral-800 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-900",
		danger: "bg-red-600 text-white hover:bg-red-700",
	};

	return (
		<button
			{...props}
			className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]} ${className}`}
		>
			{children}
		</button>
	);
}
