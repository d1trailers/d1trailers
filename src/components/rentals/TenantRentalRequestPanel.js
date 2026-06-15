"use client";

import { useState } from "react";
import { ArrowPathIcon, PlusIcon } from "@heroicons/react/24/outline";
import ActionButton from "@/components/ui/ActionButton";
import ScreenModal from "@/components/ui/ScreenModal";

function emptyForm() {
	return {
		requestType: "new_rental",
		requestedTrailerCount: "1",
		requestedTrailerType: "",
		contractStartDate: "",
		endDate: "",
		billingFrequency: "monthly",
		requestSummary: "",
	};
}

export default function TenantRentalRequestPanel({ compact = false }) {
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState(emptyForm);
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState("");
	const [submitSuccess, setSubmitSuccess] = useState("");

	async function handleSubmit(event) {
		event.preventDefault();
		setSubmitting(true);
		setSubmitError("");
		setSubmitSuccess("");

		try {
			const response = await fetch("/api/account/rental-requests", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					...form,
					requestedTrailerCount: Number(form.requestedTrailerCount),
				}),
			});
			const json = await response.json().catch(() => ({}));

			if (!response.ok) {
				setSubmitError(
					typeof json?.error === "string"
						? json.error
						: "Failed to submit rental request."
				);
				setSubmitting(false);
				return;
			}

			setForm(emptyForm());
			setSubmitSuccess("Request submitted.");
			setSubmitting(false);
		} catch {
			setSubmitError("Failed to submit rental request.");
			setSubmitting(false);
		}
	}

	return (
		<>
			<ActionButton type="button" tone="primary" onClick={() => setOpen(true)}>
				<PlusIcon className="h-5 w-5" aria-hidden="true" />
				{compact ? "New Request" : "Request Rental"}
			</ActionButton>

			<ScreenModal
				open={open}
				onClose={() => {
					setOpen(false);
					setSubmitError("");
					setSubmitSuccess("");
				}}
				closeLabel="Close rental request"
				maxWidthClass="max-w-3xl"
			>
				<div className="space-y-6">
					<div className="space-y-2">
						<p className="text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
							Rentals
						</p>
						<h2 className="font-syne text-3xl font-bold text-neutral-950 dark:text-neutral-50">
							New Rental Request
						</h2>
					</div>

					<form onSubmit={handleSubmit} className="grid gap-4">
						<div className="grid gap-4 md:grid-cols-2">
							<label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
								Requested Trailer Count
								<input
									type="number"
									min="1"
									value={form.requestedTrailerCount}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											requestedTrailerCount: event.target.value,
										}))
									}
									className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
								/>
							</label>
							<label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
								Requested Trailer Type
								<input
									type="text"
									value={form.requestedTrailerType}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											requestedTrailerType: event.target.value,
										}))
									}
									placeholder="Flatbed, enclosed, utility"
									className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
								/>
							</label>
						</div>

						<div className="grid gap-4 md:grid-cols-3">
							<label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
								Requested Start Date
								<input
									type="date"
									value={form.contractStartDate}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											contractStartDate: event.target.value,
										}))
									}
									className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
								/>
							</label>
							<label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
								Requested End Date
								<input
									type="date"
									value={form.endDate}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											endDate: event.target.value,
										}))
									}
									className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
								/>
							</label>
							<label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
								Billing Frequency
								<select
									value={form.billingFrequency}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											billingFrequency: event.target.value,
										}))
									}
									className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
								>
									<option value="weekly">Weekly</option>
									<option value="monthly">Monthly</option>
									<option value="yearly">Yearly</option>
								</select>
							</label>
						</div>

						<label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
							Notes
							<textarea
								rows={5}
								value={form.requestSummary}
								onChange={(event) =>
									setForm((current) => ({
										...current,
										requestSummary: event.target.value,
									}))
								}
								className="w-full rounded-2xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
							/>
						</label>

						<div className="flex justify-end">
							<ActionButton type="submit" tone="primary" disabled={submitting}>
								{submitting ? (
									<ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden="true" />
								) : null}
								Submit Request
							</ActionButton>
						</div>
						{submitSuccess ? (
							<p className="text-sm font-medium text-emerald-600">{submitSuccess}</p>
						) : null}
						{submitError ? (
							<p className="text-sm font-medium text-red-600">{submitError}</p>
						) : null}
					</form>
				</div>
			</ScreenModal>
		</>
	);
}
