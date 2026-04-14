"use client";

import { useRef, useState } from "react";
import Card from "@/components/ui/Card";

const REQUIRED_DOCS = [
	{ name: "utilityBill1", label: "Utility Bill (1 of 2)" },
	{ name: "utilityBill2", label: "Utility Bill (2 of 2)" },
	{ name: "licenseFront", label: "Driver License (Front)" },
	{ name: "licenseBack", label: "Driver License (Back)" },
	{ name: "tractorPlate", label: "Tractor License Plate Photo" },
];

function LoadingSpinner() {
	return (
		<span
			className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-neutral-50 border-t-transparent"
			aria-hidden="true"
		/>
	);
}

function digitsOnly(value) {
	return String(value ?? "").replace(/\D/g, "");
}

function formatPhoneInput(value) {
	const digits = digitsOnly(value).slice(0, 10);
	if (digits.length <= 3) return digits;
	if (digits.length <= 6) {
		return `${digits.slice(0, 3)}-${digits.slice(3)}`;
	}
	return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatEinInput(value) {
	const digits = digitsOnly(value).slice(0, 9);
	if (digits.length <= 2) return digits;
	return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

function formatSsnInput(value) {
	const digits = digitsOnly(value).slice(0, 9);
	if (digits.length <= 3) return digits;
	if (digits.length <= 5) {
		return `${digits.slice(0, 3)}-${digits.slice(3)}`;
	}
	return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function sanitizeDigitsInput(event, maxDigits) {
	event.currentTarget.value = digitsOnly(event.currentTarget.value).slice(0, maxDigits);
}

export default function Apply() {
	return (
		<div className="grid grid-flow-row w-full h-full gap-7 mt-25 p-5 md:px-12 lg:px-20 pb-12">
			<header className="surface-panel motion-enter rounded-2xl p-6 md:p-8">
				<p className="text-xs uppercase tracking-[0.14em] text-neutral-600 dark:text-neutral-400">
					New Rental Intake
				</p>
				<h1 className="font-syne text-3xl md:text-5xl lg:text-6xl font-bold mt-2">
					Rental Application
				</h1>
				<p className="mt-3 max-w-3xl text-neutral-700 dark:text-neutral-300 leading-relaxed">
					Complete the form below with accurate business and contact details.
					Your information is used for identity verification and rental
					qualification only.
				</p>
			</header>
			<Form />
		</div>
	);
}

function Form() {
	const formRef = useRef(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const inputClass =
		"w-full p-3 rounded-lg border border-(--border-soft) bg-neutral-50 dark:bg-neutral-900/40 text-neutral-950 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-(--branding-700)";

	const sectionClass = "surface-panel rounded-2xl p-5 md:p-6 space-y-4";

	async function handleSubmit(event) {
		event.preventDefault();
		setSubmitting(true);
		setError("");
		setSuccess("");

		try {
			const formData = new FormData(event.currentTarget);
			const response = await fetch("/api/applications", {
				method: "POST",
				body: formData,
			});
			const json = await response.json().catch(() => ({}));

			if (!response.ok) {
				setError(
					typeof json?.error === "string"
						? json.error
						: "Failed to submit application."
				);
				setSubmitting(false);
				return;
			}

			formRef.current?.reset();
			setSuccess(
				"Application submitted. Our team will review your application shortly."
			);
			setSubmitting(false);
		} catch {
			setError("Failed to submit application.");
			setSubmitting(false);
		}
	}

	return (
		<Card className="surface-panel w-full p-0 overflow-hidden">
			<form
				ref={formRef}
				onSubmit={handleSubmit}
				className="flex flex-col gap-5 p-5 md:p-8"
			>
				<section className={sectionClass}>
					<SectionTitle title="Owner Information" />
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<input
							name="ownerFirstName"
							placeholder="Principal Owner First Name"
							className={inputClass}
							autoComplete="given-name"
							required
						/>
						<input
							name="ownerLastName"
							placeholder="Principal Owner Last Name"
							className={inputClass}
							autoComplete="family-name"
							required
						/>
						<input
							name="partnerFirstName"
							placeholder="Partner First Name (optional)"
							className={inputClass}
							autoComplete="off"
						/>
						<input
							name="partnerLastName"
							placeholder="Partner Last Name (optional)"
							className={inputClass}
							autoComplete="off"
						/>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<input
							type="email"
							name="email"
							placeholder="Email"
							className={inputClass}
							autoComplete="email"
							required
						/>
						<input
							name="phone"
							placeholder="123-456-7890"
							className={inputClass}
							inputMode="tel"
							autoComplete="tel"
							maxLength={12}
							pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
							title="Enter a 10-digit phone number in the format 123-456-7890"
							onInput={(event) => {
								event.currentTarget.value = formatPhoneInput(
									event.currentTarget.value,
								);
							}}
							required
						/>
					</div>
				</section>

				<section className={sectionClass}>
					<SectionTitle title="Owner Address" />
					<input
						name="ownerAddress"
						placeholder="Street Address"
						className={inputClass}
						autoComplete="street-address"
					/>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<input
							name="ownerCity"
							placeholder="City"
							className={inputClass}
							autoComplete="address-level2"
						/>
						<input
							name="ownerRegion"
							placeholder="Country / Region"
							className={inputClass}
							autoComplete="country-name"
						/>
						<input
							name="ownerZip"
							placeholder="Zip / Postal Code"
							className={inputClass}
							autoComplete="postal-code"
						/>
					</div>
				</section>

				<section className={sectionClass}>
					<SectionTitle title="Company Information" />
					<input
						name="companyName"
						placeholder="Company Name *"
						className={inputClass}
						autoComplete="organization"
						required
					/>
					<input
						name="companyAddress"
						placeholder="Street Address"
						className={inputClass}
						autoComplete="street-address"
					/>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<input name="companyCity" placeholder="City" className={inputClass} />
						<input
							name="companyRegion"
							placeholder="Country / Region"
							className={inputClass}
						/>
						<input
							name="companyZip"
							placeholder="Zip / Postal Code"
							className={inputClass}
						/>
					</div>
				</section>

				<section className={sectionClass}>
					<SectionTitle title="Compliance Details" />
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<input
							name="ein"
							placeholder="12-3456789"
							className={inputClass}
							inputMode="numeric"
							maxLength={10}
							pattern="[0-9]{2}-[0-9]{7}"
							title="Enter a 9-digit EIN in the format 12-3456789"
							onInput={(event) => {
								event.currentTarget.value = formatEinInput(
									event.currentTarget.value,
								);
							}}
							required
						/>
						<input
							name="mcNumber"
							placeholder="MC Number *"
							className={inputClass}
							inputMode="numeric"
							maxLength={10}
							pattern="[0-9]{4,10}"
							title="Enter a numeric MC number"
							onInput={(event) => sanitizeDigitsInput(event, 10)}
							required
						/>
						<input
							name="usdot"
							placeholder="USDOT Number *"
							className={inputClass}
							inputMode="numeric"
							maxLength={9}
							pattern="[0-9]{4,9}"
							title="Enter a numeric USDOT number"
							onInput={(event) => sanitizeDigitsInput(event, 9)}
							required
						/>
					</div>
					<input
						name="rentalDuration"
						placeholder="Requested Rental Duration *"
						className={inputClass}
						required
					/>
				</section>

				<section className={sectionClass}>
					<SectionTitle title="Required Documents" />
					<p className="text-xs text-neutral-600 dark:text-neutral-400">
						Each attachment must be under 5 MB. Accepted formats: PDF, JPG,
						PNG, and WebP.
					</p>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{REQUIRED_DOCS.map((doc) => (
							<label
								key={doc.name}
								className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300"
							>
								<span>{doc.label}</span>
								<input
									type="file"
									name={doc.name}
									className={inputClass}
									accept=".pdf,image/jpeg,image/png,image/webp"
									required
								/>
							</label>
						))}
					</div>
				</section>

				<section className={sectionClass}>
					<SectionTitle title="Personal References" />
					<div className="grid grid-cols-1 gap-4">
						{[1, 2, 3].map((number) => (
							<div
								key={number}
								className="grid grid-cols-1 md:grid-cols-2 gap-4 surface-subtle rounded-xl p-3"
							>
								<input
									name={`ref${number}Name`}
									placeholder={`Reference ${number} Name`}
									className={inputClass}
								/>
								<input
									name={`ref${number}Phone`}
									placeholder={`Reference ${number} Phone`}
									className={inputClass}
									inputMode="tel"
									maxLength={12}
									pattern="([0-9]{3}-[0-9]{3}-[0-9]{4})?"
									title="Use the format 123-456-7890 when providing a phone number"
									onInput={(event) => {
										event.currentTarget.value = formatPhoneInput(
											event.currentTarget.value,
										);
									}}
								/>
							</div>
						))}
					</div>
				</section>

				<section className={sectionClass}>
					<SectionTitle title="Identity Verification" />
					<input
						name="ssn"
						placeholder="123-45-6789"
						className={inputClass}
						inputMode="numeric"
						maxLength={11}
						pattern="[0-9]{3}-[0-9]{2}-[0-9]{4}"
						title="Enter a 9-digit SSN in the format 123-45-6789"
						onInput={(event) => {
							event.currentTarget.value = formatSsnInput(
								event.currentTarget.value,
							);
						}}
						required
					/>
					<p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
						Your SSN is collected for identity verification and is not used for
						credit approval.
					</p>
				</section>

				<section className={sectionClass}>
					<SectionTitle title="Agreements" />
					<div className="flex flex-col gap-3 text-sm text-neutral-700 dark:text-neutral-300">
						<label className="flex gap-2">
							<input type="checkbox" name="ssnAuth" required />I authorize D1
							Trailers, LLC to securely store my SSN under the conditions
							described.
						</label>
						<label className="flex gap-2">
							<input type="checkbox" name="insurance" required />I agree to
							maintain Agreed Value insurance naming D1 Trailers, LLC as
							additional insured.
						</label>
						<label className="flex gap-2">
							<input type="checkbox" name="maintenance" required />I accept
							responsibility for all maintenance and inspections.
						</label>
					</div>
				</section>

				{error ? (
					<p className="text-sm font-medium text-red-600">{error}</p>
				) : null}
				{success ? (
					<p className="text-sm font-medium text-emerald-600">{success}</p>
				) : null}

				<button
					type="submit"
					disabled={submitting}
					className="mt-2 rounded-xl bg-(--branding-700) hover:bg-(--branding-800) transition-colors text-neutral-50 py-4 font-bold text-base md:text-lg flex items-center justify-center disabled:opacity-60"
				>
					{submitting ? (
						<>
							<LoadingSpinner />
							<span className="sr-only">Submitting application</span>
						</>
					) : (
						"Submit Application"
					)}
				</button>
			</form>
		</Card>
	);
}

function SectionTitle({ title }) {
	return (
		<h2 className="font-syne text-xl md:text-2xl font-bold text-neutral-950 dark:text-neutral-50">
			{title}
		</h2>
	);
}
