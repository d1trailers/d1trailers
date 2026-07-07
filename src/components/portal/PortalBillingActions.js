"use client";

import { useState } from "react";

function ActionButton({ children, disabled, onClick, tone = "primary" }) {
	const tones = {
		primary: "bg-(--branding-700) text-neutral-50 hover:bg-(--branding-800)",
		secondary: "border border-(--border-soft) text-neutral-800 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-900",
	};

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={`rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60 ${tones[tone]}`}
		>
			{children}
		</button>
	);
}

export default function PortalBillingActions({ rentalId = "" }) {
	const [loading, setLoading] = useState("");
	const [message, setMessage] = useState("");
	const [tone, setTone] = useState("muted");

	async function runAction(type) {
		setLoading(type);
		setMessage("");
		setTone("muted");

		try {
			const response = await fetch(type === "manage" ? "/api/portal/manage-billing" : "/api/portal/pay-now", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ rentalId }),
			});
			const json = await response.json().catch(() => ({}));

			if (!response.ok) {
				setMessage(typeof json?.error === "string" ? json.error : "Action unavailable right now.");
				setTone("danger");
				setLoading("");
				return;
			}

			setMessage(json?.message || "Action completed.");
			setTone(json?.url ? "success" : "muted");
			if (json?.url) {
				window.location.href = json.url;
				return;
			}
			setLoading("");
		} catch {
			setMessage("Action unavailable right now.");
			setTone("danger");
			setLoading("");
		}
	}

	const messageClass =
		tone === "danger"
			? "text-red-600"
			: tone === "success"
				? "text-emerald-700 dark:text-emerald-300"
				: "text-neutral-600 dark:text-neutral-400";

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap gap-3">
				<ActionButton onClick={() => runAction("manage")} disabled={Boolean(loading)}>
					{loading === "manage" ? "Opening..." : "Manage Billing"}
				</ActionButton>
				<ActionButton tone="secondary" onClick={() => runAction("pay")} disabled={Boolean(loading)}>
					{loading === "pay"
						? "Preparing..."
						: "Pay This Upcoming Invoice Right Now"}
				</ActionButton>
			</div>
			{message ? <p className={`text-sm ${messageClass}`}>{message}</p> : null}
		</div>
	);
}
