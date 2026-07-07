import { forwardRef } from "react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { prettifyEnumLabel } from "@/lib/displayLabels";

const StatusBadge = forwardRef(function StatusBadge(
	{
		status,
		asButton = false,
		showChevron = false,
		className = "",
		children,
		...props
	},
	ref,
) {
	const value = status || "Unknown";
	const displayValue = prettifyEnumLabel(value);
	const toneClass = getStatusClassName(value);
	const Component = asButton ? "button" : "span";

	return (
		<Component
			ref={ref}
			{...props}
			className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${toneClass} ${
				asButton ? "cursor-pointer transition-opacity hover:opacity-90" : ""
			} ${className}`}
		>
			<span>{displayValue}</span>
			{showChevron ? <ChevronDownIcon aria-hidden="true" className="size-3.5" /> : null}
			{children}
		</Component>
	);
});

export default StatusBadge;

function getStatusClassName(status) {
	const normalized = String(status).toLowerCase();

	if (normalized.includes("active")) {
		return "border-green-500 bg-green-100 text-green-800";
	}
	if (normalized.includes("overdue") || normalized.includes("past due")) {
		return "border-red-500 bg-red-100 text-red-800";
	}
	if (normalized.includes("suspended") || normalized.includes("denied")) {
		return "border-orange-500 bg-orange-100 text-orange-800";
	}
	if (
		normalized.includes("review") ||
		normalized.includes("submitted") ||
		normalized.includes("awaiting")
	) {
		return "border-blue-500 bg-blue-100 text-blue-800";
	}
	if (normalized.includes("returned") || normalized.includes("cancelled")) {
		return "border-neutral-400 bg-neutral-100 text-neutral-700";
	}

	return "border-neutral-400 bg-neutral-100 text-neutral-700";
}
