import Link from "next/link";
import { RectangleStackIcon, UsersIcon } from "@heroicons/react/24/outline";
import Card from "@/components/ui/Card";

const PREVIEW_STEPS = [
	"Trailer inventory grouped by operational availability.",
	"Open the linked tenant account from any trailer context when needed.",
	"Keep trailer assignment work visually aligned with the shared management flow.",
];

export default function AdminInventoryPage() {
	return (
		<div className="space-y-4">
			<Card className="gap-4">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="space-y-2">
						<p className="text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
							Trailer Inventory
						</p>
						<h2 className="font-syne text-3xl font-bold text-neutral-950 dark:text-neutral-50">
							Inventory Operations Surface
						</h2>
						<p className="max-w-3xl text-sm text-neutral-600 dark:text-neutral-400">
							Inventory will return as its own grouped operational view, but it will still point back to the same tenant management system whenever account-level decisions, documents, or communications are needed.
						</p>
					</div>
					<Link
						href="/admin/management"
						className="inline-flex items-center gap-2 rounded-xl bg-(--branding-700) px-4 py-3 text-sm font-semibold text-neutral-50 transition hover:bg-(--branding-800)"
					>
						<UsersIcon className="h-5 w-5" aria-hidden="true" />
						Open Management
					</Link>
				</div>
			</Card>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
				{PREVIEW_STEPS.map((step) => (
					<Card key={step}>
						<div className="flex items-start gap-3">
							<div className="rounded-2xl bg-red-50 p-3 text-(--branding-700) dark:bg-red-950/20">
								<RectangleStackIcon className="h-5 w-5" aria-hidden="true" />
							</div>
							<p className="text-sm text-neutral-700 dark:text-neutral-300">{step}</p>
						</div>
					</Card>
				))}
			</div>
		</div>
	);
}
