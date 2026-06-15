"use client";

import TenantManagementPane from "@/components/admin/TenantManagementPane";
import ScreenModal from "@/components/ui/ScreenModal";

export default function TenantManagementModal({
	open,
	onClose,
	detail,
	loading,
	error,
	activeTab,
	onTabChange,
	onCreateRental,
	onOpenRental,
	onOpenTrailer,
}) {
	return (
		<ScreenModal
			open={open}
			onClose={onClose}
			closeLabel="Close tenant management"
			maxWidthClass="max-w-7xl"
		>
			<TenantManagementPane
				detail={detail}
				loading={loading}
				error={error}
				activeTab={activeTab}
				onTabChange={onTabChange}
				onCreateRental={onCreateRental}
				onOpenRental={onOpenRental}
				onOpenTrailer={onOpenTrailer}
			/>
		</ScreenModal>
	);
}
