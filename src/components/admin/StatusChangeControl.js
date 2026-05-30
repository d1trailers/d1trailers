"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import StatusBadge from "@/components/admin/StatusBadge";

const TONE_CLASSES = {
	low: "border-amber-300 bg-amber-50 text-amber-900",
	medium: "border-orange-300 bg-orange-50 text-orange-900",
	high: "border-red-300 bg-red-50 text-red-900",
};

function getDefaultMessage(entityLabel, statusLabel) {
	return `This will change ${entityLabel} to ${statusLabel}. Review linked records before confirming.`;
}

function getMenuPosition(button) {
	if (!button) return null;
	const rect = button.getBoundingClientRect();
	return {
		top: rect.bottom + 8,
		right: Math.max(window.innerWidth - rect.right, 16),
	};
}

export default function StatusChangeControl({
	entityType,
	recordId,
	currentStatus,
	options,
	label,
	onUpdated,
}) {
	const [selectedStatus, setSelectedStatus] = useState("");
	const [menuOpen, setMenuOpen] = useState(false);
	const [modalOpen, setModalOpen] = useState(false);
	const [reason, setReason] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [menuPosition, setMenuPosition] = useState(null);
	const rootRef = useRef(null);
	const triggerRef = useRef(null);
	const menuRef = useRef(null);
	const portalReady = typeof document !== "undefined";

	useEffect(() => {
		if (!menuOpen) return;

		function updatePosition() {
			setMenuPosition(getMenuPosition(triggerRef.current));
		}

		function handlePointerDown(event) {
			const clickedTrigger = rootRef.current?.contains(event.target);
			const clickedMenu = menuRef.current?.contains(event.target);
			if (!clickedTrigger && !clickedMenu) {
				setMenuOpen(false);
			}
		}

		updatePosition();
		window.addEventListener("resize", updatePosition);
		window.addEventListener("scroll", updatePosition, true);
		document.addEventListener("mousedown", handlePointerDown);
		return () => {
			window.removeEventListener("resize", updatePosition);
			window.removeEventListener("scroll", updatePosition, true);
			document.removeEventListener("mousedown", handlePointerDown);
		};
	}, [menuOpen]);

	const isDangerous = useMemo(
		() =>
			[
				"Denied",
				"Suspended",
				"Returned",
				"Cancelled",
				"Available",
				"Maintenance",
			].includes(selectedStatus),
		[selectedStatus],
	);

	async function submitChange() {
		setLoading(true);
		setError("");

		try {
			const res = await fetch("/api/admin/status", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					entityType,
					recordId,
					nextStatus: selectedStatus,
					reason,
				}),
			});

			const json = await res.json().catch(() => ({}));
			if (!res.ok) {
				setError(
					typeof json?.error === "string"
						? json.error
						: "Failed to update status.",
				);
				setLoading(false);
				return;
			}

			setLoading(false);
			setModalOpen(false);
			setReason("");
			setSelectedStatus("");
			onUpdated?.(json);
		} catch {
			setError("Failed to update status.");
			setLoading(false);
		}
	}

	function handleOptionSelect(option) {
		setMenuOpen(false);
		if (!option || option === currentStatus) return;
		setSelectedStatus(option);
		setError("");
		setReason("");
		setModalOpen(true);
	}

	return (
		<>
			<div ref={rootRef} className="inline-flex">
				<StatusBadge
					ref={triggerRef}
					status={currentStatus}
					asButton
					showChevron
					type="button"
					onClick={() => setMenuOpen((current) => !current)}
					aria-haspopup="menu"
					aria-expanded={menuOpen}
				/>
			</div>

			{portalReady && menuOpen && menuPosition
				? createPortal(
					<div
						ref={menuRef}
						className="fixed z-[90] min-w-52 overflow-hidden rounded-xl border border-(--border-soft) bg-white shadow-2xl dark:bg-neutral-950"
						style={{ top: menuPosition.top, right: menuPosition.right }}
					>
						<div className="border-b border-(--border-soft) px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
							Change Status
						</div>
						<div className="py-1">
							{options.map((option) => {
								const isCurrent = option === currentStatus;
								return (
									<button
										key={option}
										type="button"
										onClick={() => handleOptionSelect(option)}
										className={`flex w-full items-center justify-between px-3 py-2 text-sm text-left transition-colors ${
											isCurrent
												? "bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
												: "hover:bg-neutral-100 dark:hover:bg-neutral-900"
										}`}
									>
										<span>{option}</span>
										{isCurrent ? <span className="text-xs text-neutral-500">Current</span> : null}
									</button>
								);
							})}
						</div>
					</div>,
					document.body,
				)
				: null}

			{portalReady && modalOpen
				? createPortal(
					<div className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4">
						<div className="w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-(--border-soft) bg-white p-5 shadow-2xl dark:bg-neutral-950">
							<div className="space-y-4">
								<div className="space-y-3 text-center sm:text-left">
									<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700 sm:mx-0 dark:bg-red-950/40 dark:text-red-300">
										<ExclamationTriangleIcon className="h-6 w-6" />
									</div>
									<p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-700">
										Danger Zone
									</p>
									<h3 className="text-xl font-semibold text-neutral-950 dark:text-neutral-50">
										Confirm Status Change
									</h3>
									<p className="text-sm text-neutral-600 dark:text-neutral-400">
										{label}
									</p>
								</div>

								<div className={`rounded-xl border px-4 py-3 text-sm ${TONE_CLASSES[isDangerous ? "high" : "medium"]}`}>
									<p className="font-semibold">
										{currentStatus || "Unknown"}
										{" -> "}
										{selectedStatus}
									</p>
									<p>{getDefaultMessage(entityType, selectedStatus)}</p>
								</div>

								<label className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
									<span className="font-semibold">Reason / Notes</span>
									<textarea
										value={reason}
										onChange={(event) => setReason(event.target.value)}
										className="min-h-24 rounded-lg border border-(--border-soft) bg-neutral-50 p-3 dark:bg-neutral-900/40"
										placeholder="Explain why this status change is needed."
									/>
								</label>

								{error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

								<div className="flex flex-wrap justify-end gap-2">
									<button
										type="button"
										onClick={() => {
											setModalOpen(false);
											setError("");
										}}
										className="rounded-lg px-3 py-2 text-sm font-semibold surface-subtle"
									>
										Cancel
									</button>
									<button
										type="button"
										onClick={submitChange}
										disabled={loading}
										className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-neutral-50 disabled:opacity-60"
									>
										{loading ? "Applying..." : "Confirm Change"}
									</button>
								</div>
							</div>
						</div>
					</div>,
					document.body,
				)
				: null}
		</>
	);
}
