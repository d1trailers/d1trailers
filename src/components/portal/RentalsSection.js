"use client";

import RentalRecordCard from "@/components/rentals/RentalRecordCard";
import SearchInput from "@/components/portal/SearchInput";
import SectionHeaderCard from "@/components/portal/SectionHeaderCard";
import SectionStateCard from "@/components/portal/SectionStateCard";
import Card from "@/components/ui/Card";

export default function RentalsSection({
	eyebrow = "Rentals",
	title = "Rentals",
	searchValue,
	onSearchChange,
	searchPlaceholder,
	action = null,
	loading = false,
	error = "",
	records = [],
	onOpenRecord,
	emptyMessage,
	showTenantName = false,
	grouped = false,
	groupConfig = {},
	groupedRecords = {},
	getPendingBadge = null,
	loadingMessage = "Loading rentals...",
}) {
	return (
		<div className="space-y-4">
			<SectionHeaderCard
				eyebrow={eyebrow}
				title={title}
				action={action}
				search={
					<SearchInput
						value={searchValue}
						onChange={onSearchChange}
						placeholder={searchPlaceholder}
					/>
				}
			/>

			{loading ? (
				<SectionStateCard message={loadingMessage} />
			) : error ? (
				<SectionStateCard message={error} tone="error" />
			) : grouped ? (
				<div className="flex w-full flex-col gap-4">
					{Object.entries(groupConfig).map(([groupKey, group]) => (
						<Card key={groupKey} className="grid">
							<div className="space-y-4">
								<div>
									<p className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
										{group.label}
									</p>
								</div>
								<div className="space-y-3">
									{(groupedRecords[groupKey] ?? []).length ? (
										groupedRecords[groupKey].map((record) => (
											<RentalRecordCard
												key={record.id}
												rental={record}
												onClick={onOpenRecord}
												showTenantName={showTenantName}
												pendingBadge={
													getPendingBadge ? getPendingBadge(record) : null
												}
											/>
										))
									) : (
										<div className="rounded-2xl border border-dashed border-(--border-soft) p-4 text-sm text-neutral-600 dark:text-neutral-400">
											No records.
										</div>
									)}
								</div>
							</div>
						</Card>
					))}
				</div>
			) : records.length ? (
				<div className="space-y-3">
					{records.map((record) => (
						<RentalRecordCard
							key={record.id}
							rental={record}
							onClick={onOpenRecord}
							showTenantName={showTenantName}
							pendingBadge={getPendingBadge ? getPendingBadge(record) : null}
						/>
					))}
				</div>
			) : (
				<SectionStateCard message={emptyMessage} />
			)}
		</div>
	);
}
