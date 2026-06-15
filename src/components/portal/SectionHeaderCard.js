"use client";

import Card from "@/components/ui/Card";

export default function SectionHeaderCard({
	eyebrow,
	title,
	action = null,
	search = null,
}) {
	return (
		<Card className="gap-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<p className="text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
						{eyebrow}
					</p>
					<h2 className="font-syne text-3xl font-bold text-neutral-950 dark:text-neutral-50">
						{title}
					</h2>
				</div>
				{action ? <div>{action}</div> : null}
			</div>
			{search ? <div>{search}</div> : null}
		</Card>
	);
}
