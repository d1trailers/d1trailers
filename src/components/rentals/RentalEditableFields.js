"use client";

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
		? "w-full rounded-2xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
		: "w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100";
}

function SelectField({ label, value, onChange, options }) {
	return (
		<InputLabel label={label}>
			<select value={value} onChange={onChange} className={baseInputClass()}>
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
	noteLabel = "Notes",
	noteRows = 4,
}) {
	return (
		<div className="grid gap-4">
			<div className="grid gap-4 md:grid-cols-2">
				<SelectField
					label="Billing Frequency"
					value={form.billingFrequency}
					onChange={(event) => onFieldChange("billingFrequency", event.target.value)}
					options={BILLING_FREQUENCY_OPTIONS}
				/>
			</div>

			{includeRentalStatus || includeBillingStatus ? (
				<div className="grid gap-4 md:grid-cols-2">
					{includeRentalStatus ? (
						<SelectField
							label="Rental Status"
							value={form.status}
							onChange={(event) => onFieldChange("status", event.target.value)}
							options={RENTAL_STATUS_OPTIONS}
						/>
					) : null}
					{includeBillingStatus ? (
						<SelectField
							label="Billing Status"
							value={form.billingStatus}
							onChange={(event) => onFieldChange("billingStatus", event.target.value)}
							options={BILLING_STATUS_OPTIONS}
						/>
					) : null}
				</div>
			) : null}

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{includeRate ? (
					<InputLabel label="Rate">
						<input
							type="number"
							min="0"
							step="0.01"
							value={form.rate}
							onChange={(event) => onFieldChange("rate", event.target.value)}
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
							onChange={(event) => onFieldChange("depositAmount", event.target.value)}
							className={baseInputClass()}
						/>
					</InputLabel>
				) : null}
				<InputLabel label="Requested Trailer Count">
					<input
						type="number"
						min="1"
						value={form.requestedTrailerCount}
						onChange={(event) => onFieldChange("requestedTrailerCount", event.target.value)}
						className={baseInputClass()}
					/>
				</InputLabel>
			</div>

			<div className={`grid gap-4 ${includeOperationalStart ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2"}`}>
				<InputLabel label="Contract Start">
					<input
						type="date"
						value={form.contractStartDate}
						onChange={(event) => onFieldChange("contractStartDate", event.target.value)}
						className={baseInputClass()}
					/>
				</InputLabel>
				{includeOperationalStart ? (
					<InputLabel label="Operational Start">
						<input
							type="date"
							value={form.operationalStartDate}
							onChange={(event) => onFieldChange("operationalStartDate", event.target.value)}
							className={baseInputClass()}
						/>
					</InputLabel>
				) : null}
				<InputLabel label="End Date">
					<input
						type="date"
						value={form.endDate}
						onChange={(event) => onFieldChange("endDate", event.target.value)}
						className={baseInputClass()}
					/>
				</InputLabel>
			</div>

			<InputLabel label="Requested Trailer Type">
				<input
					type="text"
					value={form.requestedTrailerType}
					onChange={(event) => onFieldChange("requestedTrailerType", event.target.value)}
					className={baseInputClass()}
				/>
			</InputLabel>

			<InputLabel label={noteLabel}>
				<textarea
					rows={noteRows}
					value={form.requestSummary}
					onChange={(event) => onFieldChange("requestSummary", event.target.value)}
					className={baseInputClass(true)}
				/>
			</InputLabel>
		</div>
	);
}
