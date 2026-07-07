"use client";

import { MinusCircleIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import { TRAILER_TYPE_OPTIONS, getTrailerTypeFormValue } from "@/lib/trailerTypes";

function normalizeRows(value) {
	const rows = Array.isArray(value) ? value : [];
	const normalized = rows
		.map((row) => ({
			trailerType: getTrailerTypeFormValue(row?.trailerType) || "flatbed",
			quantity:
				row?.quantity === null || row?.quantity === undefined
					? "1"
					: String(row.quantity),
		}))
		.filter((row) => row.trailerType);

	return normalized.length
		? normalized
		: [{ trailerType: "flatbed", quantity: "1" }];
}

function availableOptionsForRow(rows, rowIndex) {
	const selected = new Set(
		rows
			.map((row, index) => (index === rowIndex ? null : row.trailerType))
			.filter(Boolean)
	);
	return TRAILER_TYPE_OPTIONS.filter((option) => !selected.has(option.value));
}

export function serializeRequestedTrailerTypes(rows) {
	return normalizeRows(rows).map((row) => ({
		trailerType: row.trailerType,
		quantity: Number(row.quantity),
	}));
}

export default function RequestedTrailerTypesField({
	value,
	onChange,
	label = "Requested Trailer Types",
	description = "Select each trailer type needed for this rental and the requested quantity.",
}) {
	const rows = normalizeRows(value);
	const usedTypes = new Set(rows.map((row) => row.trailerType));
	const nextAvailableType = TRAILER_TYPE_OPTIONS.find(
		(option) => !usedTypes.has(option.value)
	);

	function updateRows(nextRows) {
		onChange(normalizeRows(nextRows));
	}

	function updateRow(index, patch) {
		updateRows(
			rows.map((row, rowIndex) =>
				rowIndex === index ? { ...row, ...patch } : row
			)
		);
	}

	function removeRow(index) {
		if (rows.length === 1) return;
		updateRows(rows.filter((_, rowIndex) => rowIndex !== index));
	}

	function addRow() {
		if (!nextAvailableType) return;
		updateRows([
			...rows,
			{
				trailerType: nextAvailableType.value,
				quantity: "1",
			},
		]);
	}

	return (
		<div className="rounded-2xl border border-(--border-soft) bg-white/70 p-4 dark:bg-neutral-950/40">
			<div className="mb-4 flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">
						{label}
					</p>
					{description ? (
						<p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
							{description}
						</p>
					) : null}
				</div>
				<button
					type="button"
					onClick={addRow}
					disabled={!nextAvailableType}
					className="inline-flex items-center gap-2 rounded-full border border-(--border-soft) bg-white px-3 py-2 text-xs font-semibold text-neutral-800 transition hover:border-(--branding-700) disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-950 dark:text-neutral-100"
				>
					<PlusCircleIcon className="h-4 w-4" aria-hidden="true" />
					Add Trailer Type
				</button>
			</div>

			<div className="space-y-3">
				{rows.map((row, index) => {
					const rowOptions = availableOptionsForRow(rows, index);
					return (
						<div
							key={`${row.trailerType}-${index}`}
							className="grid gap-3 md:grid-cols-[1fr_140px_auto]"
						>
							<label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
								Trailer Type
								<select
									value={row.trailerType}
									onChange={(event) =>
										updateRow(index, { trailerType: event.target.value })
									}
									className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
								>
									{rowOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</label>
							<label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
								Quantity
								<input
									type="number"
									min="1"
									value={row.quantity}
									onChange={(event) =>
										updateRow(index, { quantity: event.target.value })
									}
									className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
								/>
							</label>
							<div className="flex items-end">
								<button
									type="button"
									onClick={() => removeRow(index)}
									disabled={rows.length === 1}
									className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/50 dark:bg-neutral-950 dark:text-red-300"
									aria-label="Remove trailer type"
								>
									<MinusCircleIcon className="h-5 w-5" aria-hidden="true" />
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
