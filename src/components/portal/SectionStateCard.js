"use client";

import Card from "@/components/ui/Card";

export default function SectionStateCard({
	message,
	tone = "muted",
}) {
	const className =
		tone === "error"
			? "text-sm font-medium text-red-600"
			: "text-sm text-neutral-600 dark:text-neutral-400";

	return (
		<Card>
			<p className={className}>{message}</p>
		</Card>
	);
}
