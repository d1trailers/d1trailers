"use client";

import ScreenModal from "@/components/ui/ScreenModal";
import {
	getRentalRecordTitle,
	RentalHeaderCard,
} from "@/components/rentals/RentalDetailShared";
import { RentalBillingCard } from "@/components/rentals/RentalActivitySections";

export default function TenantBillingModal({ open, onClose, rentalView }) {
	const rental = rentalView?.rental ?? null;

	if (!rentalView || !rental) {
		return null;
	}

	return (
		<ScreenModal
			open={open}
			onClose={onClose}
			closeLabel="Close billing details"
			maxWidthClass="max-w-5xl"
		>
			<div className="space-y-5">
				<div className="space-y-2">
					<p className="text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
						Billing Details
					</p>
					<h2 className="font-syne text-3xl font-bold text-neutral-950 dark:text-neutral-50">
						{getRentalRecordTitle(rental)}
					</h2>
				</div>

				<RentalHeaderCard rental={rental} />
				<RentalBillingCard rental={rental} enableActions />
			</div>
		</ScreenModal>
	);
}
