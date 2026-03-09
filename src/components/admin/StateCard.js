import Card from "@/components/ui/Card";

export default function StateCard({ title, message, tone = "neutral" }) {
	const toneClass =
		tone === "error"
			? "text-red-700 dark:text-red-400"
			: "text-neutral-700 dark:text-neutral-300";

	return (
		<Card className="bg-neutral-200 dark:bg-neutral-800 shadow-sm">
			<h3 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50">
				{title}
			</h3>
			<p className={`text-sm ${toneClass}`}>{message}</p>
		</Card>
	);
}
