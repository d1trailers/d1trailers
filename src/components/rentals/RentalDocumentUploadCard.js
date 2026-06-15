"use client";

import { useEffect, useState } from "react";
import {
	ArrowPathIcon,
	ArrowUpTrayIcon,
	PlusIcon,
} from "@heroicons/react/24/outline";
import Card from "@/components/ui/Card";
import ActionButton from "@/components/ui/ActionButton";

const DOCUMENT_TYPE_OPTIONS = [
	{ value: "proposal", label: "Proposal" },
	{ value: "contract", label: "Contract" },
	{ value: "insurance", label: "Insurance" },
	{ value: "pickup_details", label: "Pickup Details" },
	{ value: "invoice", label: "Invoice" },
	{ value: "general", label: "General" },
];

function emptyForm() {
	return {
		documentType: "general",
		category: "",
		file: null,
	};
}

export default function RentalDocumentUploadCard({
	title = "Add Document",
	description = "Upload a rental-scoped document that should be visible from this rental.",
	onUpload,
	resetKey = "",
}) {
	const [expanded, setExpanded] = useState(false);
	const [form, setForm] = useState(emptyForm);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	useEffect(() => {
		const frame = window.requestAnimationFrame(() => {
			setExpanded(false);
			setForm(emptyForm());
			setUploading(false);
			setError("");
			setSuccess("");
		});

		return () => window.cancelAnimationFrame(frame);
	}, [resetKey]);

	async function handleSubmit(event) {
		event.preventDefault();
		if (typeof onUpload !== "function") {
			return;
		}

		if (!(form.file instanceof File)) {
			setError("Choose a file before uploading.");
			return;
		}

		setUploading(true);
		setError("");
		setSuccess("");

		const formData = new FormData();
		formData.append("documentType", form.documentType);
		formData.append("category", form.category);
		formData.append("file", form.file);

		try {
			const result = await onUpload(formData);
			if (result?.error) {
				setError(result.error);
				setUploading(false);
				return;
			}

			setSuccess("Document uploaded.");
			setForm(emptyForm());
			setExpanded(false);
			setUploading(false);
		} catch {
			setError("Failed to upload document.");
			setUploading(false);
		}
	}

	return (
		<Card>
			<div className="space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="space-y-1">
						<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
							{title}
						</h3>
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							{description}
						</p>
					</div>
					<ActionButton
						type="button"
						tone="primary"
						onClick={() => {
							setExpanded((current) => !current);
							setError("");
							setSuccess("");
						}}
					>
						<PlusIcon className="h-5 w-5" aria-hidden="true" />
						Add Document
					</ActionButton>
				</div>

				{expanded ? (
					<form className="grid gap-4" onSubmit={handleSubmit}>
						<div className="grid gap-4 md:grid-cols-2">
							<label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
								Document Type
								<select
									value={form.documentType}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											documentType: event.target.value,
										}))
									}
									className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
								>
									{DOCUMENT_TYPE_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</label>
							<label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
								Category
								<input
									type="text"
									value={form.category}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											category: event.target.value,
										}))
									}
									placeholder="Optional grouping label"
									className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
								/>
							</label>
						</div>

						<label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
							File
							<input
								type="file"
								accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
								onChange={(event) =>
									setForm((current) => ({
										...current,
										file: event.target.files?.[0] ?? null,
									}))
								}
								className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 file:mr-4 file:rounded-full file:border-0 file:bg-red-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-(--branding-700) focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100 dark:file:bg-red-950/20"
							/>
						</label>

						<div className="flex flex-wrap items-center justify-end gap-3">
							<ActionButton
								type="button"
								tone="danger"
								onClick={() => {
									setExpanded(false);
									setForm(emptyForm());
									setError("");
									setSuccess("");
								}}
							>
								Cancel
							</ActionButton>
							<ActionButton type="submit" tone="primary" disabled={uploading}>
								{uploading ? (
									<ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden="true" />
								) : (
									<ArrowUpTrayIcon className="h-5 w-5" aria-hidden="true" />
								)}
								Upload Document
							</ActionButton>
						</div>
					</form>
				) : null}

				{success ? (
					<p className="text-sm font-medium text-emerald-600">{success}</p>
				) : null}
				{error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
			</div>
		</Card>
	);
}
