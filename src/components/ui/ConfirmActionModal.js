"use client";

import { ArrowPathIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import ActionButton from "@/components/ui/ActionButton";
import ScreenModal from "@/components/ui/ScreenModal";

export default function ConfirmActionModal({
	open,
	onClose,
	onConfirm,
	title = "Confirm Action",
	message = "Are you sure you want to continue?",
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	tone = "danger",
	loading = false,
}) {
	return (
		<ScreenModal
			open={open}
			onClose={loading ? () => {} : onClose}
			closeLabel={cancelLabel}
			maxWidthClass="max-w-xl"
		>
			<div className="space-y-5">
				<div className="flex items-start gap-4">
					<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300">
						<ExclamationTriangleIcon className="h-6 w-6" aria-hidden="true" />
					</div>
					<div className="space-y-2">
						<p className="text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
							Destructive Operation
						</p>
						<h2 className="font-syne text-3xl font-bold text-neutral-950 dark:text-neutral-50">
							{title}
						</h2>
						<p className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">
							{message}
						</p>
					</div>
				</div>

				<div className="flex flex-wrap justify-end gap-3">
					<ActionButton
						type="button"
						tone="neutral"
						onClick={onClose}
						disabled={loading}
					>
						{cancelLabel}
					</ActionButton>
					<ActionButton
						type="button"
						tone={tone}
						onClick={onConfirm}
						disabled={loading}
					>
						{loading ? (
							<ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden="true" />
						) : null}
						{confirmLabel}
					</ActionButton>
				</div>
			</div>
		</ScreenModal>
	);
}
