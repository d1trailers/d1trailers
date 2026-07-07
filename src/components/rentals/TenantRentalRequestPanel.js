"use client";

import { useState } from "react";
import { ArrowPathIcon, PlusIcon } from "@heroicons/react/24/outline";
import ActionButton from "@/components/ui/ActionButton";
import ScreenModal from "@/components/ui/ScreenModal";
import RentalEditableFields from "@/components/rentals/RentalEditableFields";
import { serializeRequestedTrailerTypes } from "@/components/rentals/RequestedTrailerTypesField";

function emptyForm() {
	return {
		requestType: "new_rental",
		contractStartDate: "",
		operationalStartDate: "",
		endDate: "",
		billingFrequency: "monthly",
		requestedTrailerTypes: [{ trailerType: "flatbed", quantity: "1" }],
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
					requestedTrailerTypes: serializeRequestedTrailerTypes(
						form.requestedTrailerTypes
					),
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
						<RentalEditableFields
							form={form}
							onFieldChange={(field, value) =>
								setForm((current) => ({ ...current, [field]: value }))
							}
							includeOperationalStart
							noteLabel="Notes"
							noteRows={5}
						/>

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
