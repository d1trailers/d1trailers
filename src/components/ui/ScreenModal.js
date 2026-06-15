"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";

let openModalCount = 0;
let restoreBodyOverflow = "";

export default function ScreenModal({
	open,
	onClose,
	children,
	closeLabel = "Close modal",
	maxWidthClass = "max-w-5xl",
	panelClassName = "",
	bodyClassName = "",
}) {
	const [portalReady, setPortalReady] = useState(false);

	useEffect(() => {
		const frame = window.requestAnimationFrame(() => {
			setPortalReady(true);
		});
		return () => window.cancelAnimationFrame(frame);
	}, []);

	useEffect(() => {
		if (!portalReady || !open || typeof document === "undefined") return;

		const { body } = document;
		if (openModalCount === 0) {
			restoreBodyOverflow = body.style.overflow;
		}

		openModalCount += 1;
		body.style.overflow = "hidden";

		function handleKeyDown(event) {
			if (event.key === "Escape" && open) {
				onClose();
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			openModalCount = Math.max(0, openModalCount - 1);
			if (openModalCount === 0) {
				body.style.overflow = restoreBodyOverflow;
				restoreBodyOverflow = "";
			}

			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [onClose, open, portalReady]);

	if (!portalReady || typeof document === "undefined") {
		return null;
	}

	return createPortal(
		<div
			aria-hidden={!open}
			className={`fixed inset-0 z-[120] overflow-y-auto bg-black/55 backdrop-blur-[4px] transition-all duration-300 ease-out ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) {
					onClose();
				}
			}}
		>
			<div className="flex min-h-full items-start justify-center p-4 md:items-center md:p-6">
				<div
					role="dialog"
					aria-modal="true"
					className={`relative my-auto flex w-full ${maxWidthClass} max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-[28px] border border-(--border-soft) bg-neutral-100 shadow-2xl transition-all duration-300 ease-out dark:bg-neutral-950 md:max-h-[calc(100vh-3rem)] ${open ? "translate-y-0 scale-100 opacity-100" : "translate-y-6 scale-[0.985] opacity-0"} ${panelClassName}`}
					onMouseDown={(event) => event.stopPropagation()}
				>
					<button
						type="button"
						onClick={onClose}
						className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-(--border-soft) bg-white/90 text-neutral-700 transition hover:bg-white dark:bg-neutral-900/90 dark:text-neutral-200"
						aria-label={closeLabel}
					>
						<XMarkIcon className="h-5 w-5" aria-hidden="true" />
					</button>

					<div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 ${bodyClassName}`}>
						{children}
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}
