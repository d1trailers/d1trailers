import Card from "@/components/ui/Card";

export default function MetricCard({ label, value, hint }) {
	return (
		<Card className="bg-neutral-200 dark:bg-neutral-800 shadow-sm min-w-52">
			<p className="text-sm text-neutral-600 dark:text-neutral-400">{label}</p>
			<p className="font-syne text-3xl font-bold text-neutral-950 dark:text-neutral-50">
				{value ?? 0}
			</p>
			{hint ? (
				<p className="text-xs text-neutral-600 dark:text-neutral-400">{hint}</p>
			) : null}
		</Card>
	);
}
