"use client";

import RequestedTrailerTypesField from "@/components/rentals/RequestedTrailerTypesField";

const RENTAL_STATUS_OPTIONS = [
	["draft", "Draft"],
	["customer_review", "Customer Review"],
	["changes_pending", "Changes Pending"],
	["awaiting_first_payment", "Awaiting First Payment"],
	["active", "Active"],
	["past_due", "Past Due"],
	["suspended", "Suspended"],
	["returned", "Returned"],
	["declined", "Declined"],
	["cancelled", "Cancelled"],
];

const BILLING_STATUS_OPTIONS = [
	["draft", "Draft"],
	["awaiting_first_payment", "Awaiting First Payment"],
	["active", "Active"],
	["past_due", "Past Due"],
	["suspended", "Suspended"],
	["cancelled", "Cancelled"],
	["unpaid", "Unpaid"],
];

const BILLING_FREQUENCY_OPTIONS = [
	["weekly", "Weekly"],
	["monthly", "Monthly"],
	["yearly", "Yearly"],
];

function InputLabel({ label, children }) {
	return (
		<label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
			{label}
			{children}
		</label>
	);
}

function baseInputClass(multiline = false) {
	return multiline
		? "w-full rounded-2xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 dark:bg-neutral-950/50 dark:text-neutral-100 dark:disabled:bg-neutral-900/70"
		: "w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 dark:bg-neutral-950/50 dark:text-neutral-100 dark:disabled:bg-neutral-900/70";
}

function SelectField({ label, value, onChange, options, disabled = false }) {
	return (
		<InputLabel label={label}>
			<select
				value={value}
				onChange={onChange}
				disabled={disabled}
				className={baseInputClass()}
			>
				{options.map(([optionValue, optionLabel]) => (
					<option key={optionValue} value={optionValue}>
						{optionLabel}
					</option>
				))}
			</select>
		</InputLabel>
	);
}

export default function RentalEditableFields({
	form,
	onFieldChange,
	includeRentalStatus = false,
	includeBillingStatus = false,
	includeRate = false,
	includeDeposit = false,
	includeOperationalStart = false,
	includeRequestDates = true,
	includeRequestedTrailers = true,
	includeBillingFrequency = true,
	includeNotes = true,
	disabledFields = {},
	noteLabel = "Notes",
	noteRows = 4,
}) {
	function isDisabled(field) {
		return Boolean(disabledFields?.[field]);
	}

	return (
		<div className="grid gap-4">
			{includeBillingFrequency ? (
				<div className="grid gap-4">
					<SelectField
						label="Billing Frequency"
						value={form.billingFrequency}
						onChange={(event) =>
							onFieldChange("billingFrequency", event.target.value)
						}
						options={BILLING_FREQUENCY_OPTIONS}
						disabled={isDisabled("billingFrequency")}
					/>
				</div>
			) : null}

			{includeRentalStatus || includeBillingStatus ? (
				<div className="grid gap-4">
					{includeRentalStatus ? (
						<SelectField
							label="Rental Status"
							value={form.status}
							onChange={(event) => onFieldChange("status", event.target.value)}
							options={RENTAL_STATUS_OPTIONS}
							disabled={isDisabled("status")}
						/>
					) : null}
					{includeBillingStatus ? (
						<SelectField
							label="Billing Status"
							value={form.billingStatus}
							onChange={(event) =>
								onFieldChange("billingStatus", event.target.value)
							}
							options={BILLING_STATUS_OPTIONS}
							disabled={isDisabled("billingStatus")}
						/>
					) : null}
				</div>
			) : null}

			{includeRate || includeDeposit ? (
				<div className="grid gap-4">
					{includeRate ? (
						<InputLabel label="Rate">
							<input
								type="number"
								min="0"
								step="0.01"
								value={form.rate}
								onChange={(event) => onFieldChange("rate", event.target.value)}
								disabled={isDisabled("rate")}
								className={baseInputClass()}
							/>
						</InputLabel>
					) : null}
					{includeDeposit ? (
						<InputLabel label="Deposit">
							<input
								type="number"
								min="0"
								step="0.01"
								value={form.depositAmount}
								onChange={(event) =>
									onFieldChange("depositAmount", event.target.value)
								}
								disabled={isDisabled("depositAmount")}
								className={baseInputClass()}
							/>
						</InputLabel>
					) : null}
				</div>
			) : null}

			{includeRequestDates ? (
				<div className="grid gap-4 grid-cols-3">
					<InputLabel label="Contract Start">
						<input
							type="date"
							value={form.contractStartDate}
							onChange={(event) =>
								onFieldChange("contractStartDate", event.target.value)
							}
							disabled={isDisabled("contractStartDate")}
							className={baseInputClass()}
						/>
					</InputLabel>
					{includeOperationalStart ? (
						<InputLabel label="Operational Start">
							<input
								type="date"
								value={form.operationalStartDate}
								onChange={(event) =>
									onFieldChange("operationalStartDate", event.target.value)
								}
								disabled={isDisabled("operationalStartDate")}
								className={baseInputClass()}
							/>
						</InputLabel>
					) : null}
					<InputLabel label="End Date">
						<input
							type="date"
							value={form.endDate}
							onChange={(event) => onFieldChange("endDate", event.target.value)}
							disabled={isDisabled("endDate")}
							className={baseInputClass()}
						/>
					</InputLabel>
				</div>
			) : null}

			{includeRequestedTrailers ? (
				<RequestedTrailerTypesField
					value={form.requestedTrailerTypes}
					onChange={(rows) => onFieldChange("requestedTrailerTypes", rows)}
				/>
			) : null}

			{includeNotes ? (
				<InputLabel label={noteLabel}>
					<textarea
						rows={noteRows}
						value={form.requestSummary}
						onChange={(event) =>
							onFieldChange("requestSummary", event.target.value)
						}
						disabled={isDisabled("requestSummary")}
						className={baseInputClass(true)}
					/>
				</InputLabel>
			) : null}
		</div>
	);
}
