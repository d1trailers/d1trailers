"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import TenantManagementPane from "@/components/admin/TenantManagementPane";

export default function TenantManagementModal({
	open,
	onClose,
	detail,
	loading,
	error,
	activeTab,
	onTabChange,
	notes,
	onNotesChange,
	onSubmitAction,
	actionLoading,
	actionError,
	communicationDraft,
	onCommunicationDraftChange,
	onCommunicationSubmit,
	communicationSubmitting,
	communicationError,
	communicationSuccess,
}) {
	useEffect(() => {
		if (!open || typeof document === "undefined") return;

		const { body } = document;
		const previousOverflow = body.style.overflow;
		body.style.overflow = "hidden";

		function handleKeyDown(event) {
			if (event.key === "Escape") {
				onClose();
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			body.style.overflow = previousOverflow;
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [onClose, open]);

	if (typeof document === "undefined" || !open) {
		return null;
	}

	return createPortal(
		<div
			className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-[2px]"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) {
					onClose();
				}
			}}
		>
			<div className="flex min-h-full items-center justify-center p-4 md:p-6">
				<div
					role="dialog"
					aria-modal="true"
					className="relative w-full max-w-7xl max-h-[calc(100vh-2rem)] overflow-hidden rounded-[28px] border border-(--border-soft) bg-neutral-100 shadow-2xl dark:bg-neutral-950 md:max-h-[calc(100vh-3rem)]"
					onMouseDown={(event) => event.stopPropagation()}
				>
					<button
						type="button"
						onClick={onClose}
						className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-(--border-soft) bg-white/90 text-neutral-700 transition hover:bg-white dark:bg-neutral-900/90 dark:text-neutral-200"
						aria-label="Close tenant management"
					>
						<XMarkIcon className="h-5 w-5" aria-hidden="true" />
					</button>

					<div className="max-h-[calc(100vh-2rem)] overflow-y-auto p-4 md:max-h-[calc(100vh-3rem)] md:p-6">
						<TenantManagementPane
							detail={detail}
							loading={loading}
							error={error}
							activeTab={activeTab}
							onTabChange={onTabChange}
							notes={notes}
							onNotesChange={onNotesChange}
							onSubmitAction={onSubmitAction}
							actionLoading={actionLoading}
							actionError={actionError}
							communicationDraft={communicationDraft}
							onCommunicationDraftChange={onCommunicationDraftChange}
							onCommunicationSubmit={onCommunicationSubmit}
							communicationSubmitting={communicationSubmitting}
							communicationError={communicationError}
							communicationSuccess={communicationSuccess}
						/>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}
