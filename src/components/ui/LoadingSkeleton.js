export function SkeletonLine({ className = "" }) {
	return <div className={`loading-shimmer rounded-md h-4 ${className}`} />;
}

export function SkeletonBlock({ className = "" }) {
	return <div className={`loading-shimmer rounded-xl ${className}`} />;
}

export function LoadingPanel({ title = "Loading", subtitle = "" }) {
	return (
		<div className="surface-panel motion-fade w-full rounded-2xl p-6">
			<div className="space-y-3">
				<div className="loading-shimmer h-6 rounded-md w-48" />
				{subtitle ? <p className="text-sm text-neutral-600">{subtitle}</p> : null}
				<div className="grid grid-cols-1 gap-3">
					<SkeletonLine className="w-full" />
					<SkeletonLine className="w-4/5" />
					<SkeletonLine className="w-3/5" />
				</div>
				<p className="text-sm text-neutral-600 dark:text-neutral-400">{title}</p>
			</div>
		</div>
	);
}

export function LoadingCardGrid({ count = 3 }) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
			{Array.from({ length: count }).map((_, index) => (
				<div
					key={`skeleton-card-${index}`}
					className="surface-panel motion-fade rounded-2xl p-5 space-y-3"
				>
					<SkeletonLine className="w-2/3 h-5" />
					<SkeletonLine className="w-full" />
					<SkeletonLine className="w-5/6" />
					<SkeletonBlock className="w-full h-24" />
				</div>
			))}
		</div>
	);
}
