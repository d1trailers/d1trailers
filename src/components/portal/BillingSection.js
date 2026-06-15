"use client";

import BillingRecordCard from "@/components/billing/BillingRecordCard";
import SearchInput from "@/components/portal/SearchInput";
import SectionHeaderCard from "@/components/portal/SectionHeaderCard";
import SectionStateCard from "@/components/portal/SectionStateCard";

export default function BillingSection({
	eyebrow = "Billing",
	title = "Billing",
	searchValue,
	onSearchChange,
	searchPlaceholder,
	loading = false,
	error = "",
	records = [],
	onOpenRecord,
	emptyMessage,
	showTenantName = false,
	loadingMessage = "Loading billing...",
}) {
	return (
		<div className="space-y-4">
			<SectionHeaderCard
				eyebrow={eyebrow}
				title={title}
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
			) : records.length ? (
				<div className="space-y-3">
					{records.map((record) => (
						<BillingRecordCard
							key={record.id}
							record={record}
							onClick={onOpenRecord}
							showTenantName={showTenantName}
						/>
					))}
				</div>
			) : (
				<SectionStateCard message={emptyMessage} />
			)}
		</div>
	);
}
