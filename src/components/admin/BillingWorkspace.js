"use client";

import { useMemo, useState } from "react";
import RentalManagementModal from "@/components/admin/RentalManagementModal";
import useAdminRentalsManager from "@/components/admin/useAdminRentalsManager";
import BillingSection from "@/components/portal/BillingSection";

export default function BillingWorkspace() {
	const [search, setSearch] = useState("");
	const {
		rentals,
		tenants,
		availableTrailers,
		loading,
		error,
		modalOpen,
		modalMode,
		detail,
		detailLoading,
		detailError,
		saving,
		deleteLoading,
		submitError,
		openEditModal,
		closeModal,
		handleSubmit,
		handleDelete,
	} = useAdminRentalsManager();

	const billingRecords = useMemo(
		() =>
			rentals.filter(
				(rental) =>
					rental.recordKind === "agreement" ||
					rental.status === "awaiting_first_payment" ||
					rental.billingStatus === "awaiting_first_payment",
			),
		[rentals],
	);

	const filteredRecords = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return billingRecords;
		return billingRecords.filter((record) =>
			[
				record.tenantName,
				record.status,
				record.billingStatus,
				record.billingFrequency,
				record.lastInvoiceId,
			]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(query)),
		);
	}, [billingRecords, search]);

	return (
		<>
			<BillingSection
				eyebrow="Billing"
				title="Billing Watchlist"
				searchValue={search}
				onSearchChange={setSearch}
				searchPlaceholder="Search by tenant, billing status, or invoice"
				loading={loading}
				error={error}
				records={filteredRecords}
				onOpenRecord={openEditModal}
				showTenantName
				emptyMessage="No billing records match this search."
				loadingMessage="Loading billing..."
			/>

			<RentalManagementModal
				open={modalOpen}
				onClose={closeModal}
				mode={modalMode}
				detail={detail}
				loading={detailLoading}
				error={detailError}
				onSubmit={handleSubmit}
				onDelete={handleDelete}
				submitting={saving}
				deleting={deleteLoading}
				submitError={submitError}
				tenantOptions={tenants}
				availableTrailerOptions={availableTrailers}
			/>
		</>
	);
}
