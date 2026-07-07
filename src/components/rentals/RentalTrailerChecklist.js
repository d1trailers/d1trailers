"use client";

import { CheckCircleIcon } from "@heroicons/react/24/outline";
import Card from "@/components/ui/Card";
import SearchInput from "@/components/portal/SearchInput";
import { formatTrailerType } from "@/lib/trailerTypes";

function trailerLabel(trailer) {
	return trailer.trailerCode || trailer.vin || trailer.id || "Trailer";
}

export default function RentalTrailerChecklist({
	title = "Trailers",
	description = "",
	searchValue = "",
	onSearchChange,
	searchPlaceholder = "Search by code, type, plate, or VIN",
	trailers = [],
	selectedTrailerIds = [],
	onToggleTrailer,
	readOnly = false,
	emptyMessage = "No trailers are available.",
}) {
	const selectedSet = new Set(selectedTrailerIds);

	return (
		<Card>
			<div className="space-y-3">
				<div className="space-y-1">
					<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
						{title}
					</h3>
					{description ? (
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							{description}
						</p>
					) : null}
				</div>

				{typeof onSearchChange === "function" ? (
					<SearchInput
						value={searchValue}
						onChange={onSearchChange}
						placeholder={searchPlaceholder}
						className="min-w-0"
					/>
				) : null}

				{trailers.length ? (
					<div className="space-y-3">
						{trailers.map((trailer) => {
							const checked = selectedSet.has(trailer.id);
							const Wrapper = readOnly ? "div" : "label";

							return (
								<Wrapper
									key={trailer.id}
									className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
										checked
											? "border-(--branding-700) bg-white text-neutral-900 dark:bg-neutral-950/70 dark:text-neutral-100"
											: "border-(--border-soft) bg-white/80 text-neutral-800 dark:bg-neutral-950/60 dark:text-neutral-100"
									} ${readOnly ? "" : "cursor-pointer hover:border-(--branding-700)"}`}
								>
									{readOnly ? (
										<CheckCircleIcon
											className={`h-5 w-5 shrink-0 ${
												checked ? "text-(--branding-700)" : "text-neutral-400"
											}`}
											aria-hidden="true"
										/>
									) : (
										<input
											type="checkbox"
											checked={checked}
											onChange={() => onToggleTrailer?.(trailer.id)}
											className="h-4 w-4 rounded border-neutral-300"
										/>
									)}
									<div className="min-w-0 flex-1">
										<p className="truncate font-semibold text-neutral-950 dark:text-neutral-50">
											{trailerLabel(trailer)}
										</p>
										<p className="text-neutral-600 dark:text-neutral-400">
											{formatTrailerType(trailer.trailerType)} |{" "}
											{trailer.plateNumber || "No plate"}
										</p>
										{trailer.assignmentStatus ? (
											<p className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
												{trailer.assignmentStatus}
											</p>
										) : null}
									</div>
								</Wrapper>
							);
						})}
					</div>
				) : (
					<div className="rounded-2xl border border-dashed border-(--border-soft) p-4 text-sm text-neutral-600 dark:text-neutral-400">
						{emptyMessage}
					</div>
				)}
			</div>
		</Card>
	);
}
