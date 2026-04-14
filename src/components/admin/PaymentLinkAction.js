"use client";

import { useState } from "react";

export default function PaymentLinkAction({
	rentalRecordId,
	label = "Generate Payment Link",
	disabled = false,
	onCompleted,
}) {
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");
	const [tone, setTone] = useState("muted");

	async function handleClick() {
		if (!rentalRecordId || disabled) return;

		setLoading(true);
		setMessage("");
		setTone("muted");

		try {
			const response = await fetch(
				`/api/admin/payments/${encodeURIComponent(rentalRecordId)}/link`,
				{
					method: "POST",
				}
			);
			const json = await response.json().catch(() => ({}));

			if (!response.ok) {
				setTone("error");
				setMessage(
					typeof json?.error === "string"
						? json.error
						: "Failed to generate payment link."
				);
				setLoading(false);
				return;
			}

			if (json?.url) {
				window.open(json.url, "_blank", "noopener,noreferrer");
			}

			setTone(json?.mode === "disabled" ? "warning" : "success");
			setMessage(
				typeof json?.message === "string"
					? json.message
					: "Payment link is ready."
			);
			setLoading(false);
			onCompleted?.(json);
		} catch {
			setTone("error");
			setMessage("Failed to generate payment link.");
			setLoading(false);
		}
	}

	const messageClass =
		tone === "error"
			? "text-red-600"
			: tone === "success"
				? "text-emerald-600"
				: tone === "warning"
					? "text-amber-600"
					: "text-neutral-600 dark:text-neutral-400";

	return (
		<div className="space-y-2">
			<button
				type="button"
				onClick={handleClick}
				disabled={disabled || loading || !rentalRecordId}
				className="rounded-lg border border-(--border-soft) px-3 py-2 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-100 dark:hover:bg-neutral-900"
			>
				{loading ? "Preparing" : label}
			</button>
			{message ? <p className={`text-xs ${messageClass}`}>{message}</p> : null}
		</div>
	);
}
