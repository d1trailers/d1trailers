"use client";

import { useMemo, useState } from "react";
import { ArrowPathIcon, ChevronUpDownIcon } from "@heroicons/react/24/outline";

export default function AccountSwitcher({
	memberships,
	activeTenantId,
	allowContinue = false,
}) {
	const [selectedTenantId, setSelectedTenantId] = useState(activeTenantId ?? "");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const activeMembership = useMemo(
		() => memberships.find((membership) => membership.tenantId === activeTenantId) ?? null,
		[memberships, activeTenantId]
	);

	async function handleSwitch() {
		if (!selectedTenantId) return;

		if (selectedTenantId === activeTenantId && allowContinue) {
			window.location.href = activeMembership?.destination || "/portal/overview";
			return;
		}

		if (selectedTenantId === activeTenantId) return;
		setLoading(true);
		setError("");

		try {
			const response = await fetch("/api/account/switch", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ tenantId: selectedTenantId }),
			});

			const json = await response.json().catch(() => ({}));
			if (!response.ok) {
				setError(
					typeof json?.error === "string"
						? json.error
						: "Unable to switch accounts right now."
				);
				setLoading(false);
				return;
			}

			window.location.href =
				typeof json?.destination === "string" ? json.destination : "/portal/overview";
		} catch {
			setError("Unable to switch accounts right now.");
			setLoading(false);
		}
	}

	if (!memberships.length) return null;

	return (
		<div className="surface-subtle rounded-2xl p-4 space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
						Account
					</p>
					<p className="font-semibold text-neutral-950 dark:text-neutral-50">
						{activeMembership?.tenantName ?? "Select an account"}
					</p>
				</div>
			</div>

			{memberships.length > 1 ? (
				<div className="flex flex-col gap-3 md:flex-row">
					<div className="relative flex-1">
						<ChevronUpDownIcon
							className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500"
							aria-hidden="true"
						/>
						<select
							value={selectedTenantId}
							onChange={(event) => setSelectedTenantId(event.target.value)}
							className="w-full appearance-none rounded-xl border border-(--border-soft) bg-white px-4 py-3 pr-10 text-sm text-neutral-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950 dark:text-neutral-50"
						>
							{memberships.map((membership) => (
								<option key={membership.tenantId} value={membership.tenantId}>
									{membership.tenantName} - {membership.role === "account_owner" ? "Owner" : "User"}
								</option>
							))}
						</select>
					</div>
					<button
						type="button"
						onClick={handleSwitch}
						disabled={
							loading || (!allowContinue && selectedTenantId === activeTenantId)
						}
						className="inline-flex items-center justify-center gap-2 rounded-xl bg-(--branding-700) px-4 py-3 text-sm font-semibold text-neutral-50 transition hover:bg-(--branding-800) disabled:cursor-not-allowed disabled:opacity-60"
					>
						{loading ? (
							<ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden="true" />
						) : null}
						{allowContinue ? "Continue" : "Switch Account"}
					</button>
				</div>
			) : (
				<p className="text-sm text-neutral-600 dark:text-neutral-400">
					This login is currently attached to one account.
				</p>
			)}

			{error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
		</div>
	);
}

