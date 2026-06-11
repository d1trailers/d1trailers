import Link from "next/link";
import { ClipboardDocumentListIcon, UsersIcon } from "@heroicons/react/24/outline";
import Card from "@/components/ui/Card";

const PREVIEW_STEPS = [
	"Grouped rental queues by operational state.",
	"Quick links back into tenant management for the same account.",
	"Separate rental state from billing state in the read model.",
];

export default function AdminRentalsPage() {
	return (
		<div className="space-y-4">
			<Card className="gap-4">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="space-y-2">
						<p className="text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
							Active Rentals
						</p>
						<h2 className="font-syne text-3xl font-bold text-neutral-950 dark:text-neutral-50">
							Rental Operations Surface
						</h2>
						<p className="max-w-3xl text-sm text-neutral-600 dark:text-neutral-400">
							This area is being rebuilt to match the new management-first admin workflow. Rental records will use the same browse-then-open pattern as tenant management, with direct handoff back to the shared tenant pane.
						</p>
					</div>
					<div className="flex flex-wrap gap-3">
						<Link
							href="/admin/management"
							className="inline-flex items-center gap-2 rounded-xl bg-(--branding-700) px-4 py-3 text-sm font-semibold text-neutral-50 transition hover:bg-(--branding-800)"
						>
							<UsersIcon className="h-5 w-5" aria-hidden="true" />
							Open Management
						</Link>
					</div>
				</div>
			</Card>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
				{PREVIEW_STEPS.map((step) => (
					<Card key={step}>
						<div className="flex items-start gap-3">
							<div className="rounded-2xl bg-red-50 p-3 text-(--branding-700) dark:bg-red-950/20">
								<ClipboardDocumentListIcon className="h-5 w-5" aria-hidden="true" />
							</div>
							<p className="text-sm text-neutral-700 dark:text-neutral-300">{step}</p>
						</div>
					</Card>
				))}
			</div>
		</div>
	);
}
