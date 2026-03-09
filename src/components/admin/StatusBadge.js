export default function StatusBadge({ status }) {
	const value = status || "Unknown";
	const className = getStatusClassName(value);

	return (
		<span
			className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
		>
			{value}
		</span>
	);
}

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
