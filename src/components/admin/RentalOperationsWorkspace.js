"use client";

import { useMemo, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import ActionButton from "@/components/ui/ActionButton";
import RentalManagementModal from "@/components/admin/RentalManagementModal";
import useAdminRentalsManager from "@/components/admin/useAdminRentalsManager";
import RentalsSection from "@/components/portal/RentalsSection";

const GROUP_CONFIG = {
	drafts: {
		label: "Drafts",
		description: "Rental drafts still being prepared internally.",
	},
	customerReview: {
		label: "Out for Customer Review",
		description: "Proposals currently waiting on tenant review or decision.",
	},
	changesPending: {
		label: "Changes Pending",
		description: "Tenant-requested revisions waiting on staff review.",
	},
	awaitingPayment: {
		label: "Awaiting First Payment",
		description: "Accepted agreements pending first-payment activation.",
	},
	live: {
		label: "Live Agreements",
		description: "Operational rentals with current billing and trailer state.",
	},
	closed: {
		label: "Closed / Resolved",
		description: "Resolved requests and returned or cancelled agreements.",
	},
};

function groupRental(rental) {
	if (rental.status === "draft") {
		return "drafts";
	}
	if (rental.status === "customer_review") {
		return "customerReview";
	}
	if (rental.status === "changes_pending") {
		return "changesPending";
	}
	if (
		rental.recordKind === "agreement" &&
		rental.status === "awaiting_first_payment"
	) {
		return "awaitingPayment";
	}
	if (["active", "past_due", "suspended"].includes(rental.status)) {
		return "live";
	}
	return "closed";
}

export default function RentalOperationsWorkspace() {
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
		openCreateModal,
		openEditModal,
		closeModal,
		handleSubmit,
		handleDelete,
		handleRemoveAssignment,
		handleUploadDocument,
		handleSendCommunication,
	} = useAdminRentalsManager();

	const filteredRentals = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return rentals;

		return rentals.filter((rental) =>
			[
				rental.tenantName,
				rental.status,
				rental.billingStatus,
				rental.recordKind,
				rental.requestKind,
				rental.requestedTrailerType,
			]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(query)),
		);
	}, [rentals, search]);

	const groupedRentals = useMemo(() => {
		const groups = {
			drafts: [],
			customerReview: [],
			changesPending: [],
			awaitingPayment: [],
			live: [],
			closed: [],
		};
		for (const rental of filteredRentals) {
			groups[groupRental(rental)].push(rental);
		}
		return groups;
	}, [filteredRentals]);

	return (
		<>
			<RentalsSection
				eyebrow="Rental Operations"
				title="Rentals"
				searchValue={search}
				onSearchChange={setSearch}
				searchPlaceholder="Search by tenant, status, request type, or trailer type"
				action={
					<ActionButton type="button" tone="primary" onClick={openCreateModal}>
						<PlusIcon className="h-5 w-5" aria-hidden="true" />
						Add Rental
					</ActionButton>
				}
				loading={loading}
				error={error}
				grouped
				groupConfig={GROUP_CONFIG}
				groupedRecords={groupedRentals}
				onOpenRecord={openEditModal}
				showTenantName
				emptyMessage="No rental records match this search."
				loadingMessage="Loading rental operations..."
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
				onSendCommunication={handleSendCommunication}
				onRemoveAssignment={handleRemoveAssignment}
				onUploadDocument={handleUploadDocument}
				tenantOptions={tenants}
				availableTrailerOptions={availableTrailers}
			/>
		</>
	);
}
