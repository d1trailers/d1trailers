"use client";

import { useRef, useState } from "react";
import {
	CheckCircleIcon,
	DocumentPlusIcon,
	PaperClipIcon,
	PlusIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import Card from "@/components/ui/Card";
import ScreenModal from "@/components/ui/ScreenModal";

const DOCUMENT_OPTIONS = [
	{ value: "utilityBill1", label: "Utility Bill (1 of 2)", required: true },
	{ value: "utilityBill2", label: "Utility Bill (2 of 2)", required: true },
	{ value: "licenseFront", label: "Driver's License (Front)", required: true },
	{ value: "licenseBack", label: "Driver's License (Back)", required: true },
	{ value: "tractorPlate", label: "Tractor License Plate Photo", required: true },
	{ value: "other", label: "Other Supporting Document", required: false },
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

function FieldHint({ children }) {
	return (
		<p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
			{children}
		</p>
	);
}

function getDocumentOption(value) {
	return (
		DOCUMENT_OPTIONS.find((option) => option.value === value) ??
		DOCUMENT_OPTIONS[0]
	);
}

function getMissingRequiredDocuments(documents) {
	const selectedRequiredTypes = new Set(
		documents
			.filter((document) => document.file)
			.map((document) => document.type)
			.filter((type) => getDocumentOption(type).required),
	);

	return DOCUMENT_OPTIONS.filter(
		(option) => option.required && !selectedRequiredTypes.has(option.value),
	);
}

function createDocumentRow(type, file) {
	return {
		id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
		type,
		file,
		fileName: file?.name ?? "Attached file",
		fileSize: file?.size ?? 0,
	};
}

function formatFileSize(size) {
	if (!Number.isFinite(size) || size <= 0) return "File attached";
	if (size < 1024) return `${size} B`;
	if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
	return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Apply() {
	return (
		<div className="grid grid-flow-row w-full h-full gap-7 mt-25 p-5 md:px-12 lg:px-20 pb-12">
			<header className="surface-panel motion-enter rounded-2xl p-6 md:p-8">
				<p className="text-xs uppercase tracking-[0.14em] text-neutral-600 dark:text-neutral-400">
					New Account Intake
				</p>
				<h1 className="font-syne text-3xl md:text-5xl lg:text-6xl font-bold mt-2">
					Account Application
				</h1>
			</header>
			<Form />
		</div>
	);
}

function Form() {
	const formRef = useRef(null);
	const [documents, setDocuments] = useState([]);
	const [documentModalOpen, setDocumentModalOpen] = useState(false);
	const [documentDraft, setDocumentDraft] = useState({
		type: DOCUMENT_OPTIONS[0].value,
		file: null,
	});
	const [documentDraftError, setDocumentDraftError] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const inputClass =
		"w-full p-3 rounded-lg border border-(--border-soft) bg-neutral-50 dark:bg-neutral-900/40 text-neutral-950 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-(--branding-700)";

	const sectionClass = "surface-panel rounded-2xl p-5 md:p-6 space-y-4";
	const missingRequiredDocuments = getMissingRequiredDocuments(documents);
	const attachedRequiredTypes = new Set(
		documents
			.filter((document) => document.file && getDocumentOption(document.type).required)
			.map((document) => document.type),
	);

	function handleOpenDocumentModal() {
		const nextType = missingRequiredDocuments[0]?.value ?? "other";
		setDocumentDraft({ type: nextType, file: null });
		setDocumentDraftError("");
		setDocumentModalOpen(true);
	}

	function handleCloseDocumentModal() {
		setDocumentModalOpen(false);
		setDocumentDraftError("");
		setDocumentDraft({ type: DOCUMENT_OPTIONS[0].value, file: null });
	}

	function handleAttachDocument() {
		const selectedOption = getDocumentOption(documentDraft.type);

		if (!documentDraft.file) {
			setDocumentDraftError("Choose a file before attaching this document.");
			return;
		}

		setDocuments((currentDocuments) => [
			...currentDocuments.filter(
				(document) =>
					!(
						selectedOption.required &&
						document.type === documentDraft.type
					),
			),
			createDocumentRow(documentDraft.type, documentDraft.file),
		]);
		handleCloseDocumentModal();
	}

	function handleRemoveDocument(documentId) {
		setDocuments((currentDocuments) =>
			currentDocuments.filter((document) => document.id !== documentId),
		);
	}

	async function handleSubmit(event) {
		event.preventDefault();
		setSubmitting(true);
		setError("");
		setSuccess("");

		try {
			const missingDocuments = getMissingRequiredDocuments(documents);
			if (missingDocuments.length) {
				setError(
					`Add the required documents before submitting: ${missingDocuments
						.map((document) => document.label)
						.join(", ")}.`,
				);
				setSubmitting(false);
				return;
			}

			const formData = new FormData(event.currentTarget);
			for (const document of documents) {
				if (!document.file) continue;
				const inputName =
					document.type === "other" ? "otherDocuments" : document.type;
				formData.append(inputName, document.file, document.fileName);
			}

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
			setDocuments([]);
			handleCloseDocumentModal();
			setSuccess(
				"Account application submitted. You can sign in with this email and create rental requests from your portal once your account access is claimed."
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
						<label className="space-y-1.5">
							<span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
								Federal Tax ID (EIN)
							</span>
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
							<FieldHint>
								Your business tax identification number, formatted as
								12-3456789.
							</FieldHint>
						</label>
						<label className="space-y-1.5">
							<span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
								MC Number
							</span>
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
							<FieldHint>
								Your FMCSA Motor Carrier number, used to identify interstate
								for-hire carriers.
							</FieldHint>
						</label>
						<label className="space-y-1.5">
							<span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
								USDOT Number
							</span>
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
							<FieldHint>
								Your U.S. Department of Transportation number for safety and
								carrier records.
							</FieldHint>
						</label>
					</div>
				</section>

				<section className={sectionClass}>
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div>
							<SectionTitle title="Required Documents" />
							<p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
								Each attachment must be under 5 MB. Accepted formats: PDF, JPG,
								PNG, and WebP.
							</p>
						</div>
						<button
							type="button"
							onClick={handleOpenDocumentModal}
							className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-bold text-neutral-50 transition-colors hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-950 dark:hover:bg-neutral-200"
						>
							<DocumentPlusIcon className="h-5 w-5" aria-hidden="true" />
							Add Document
						</button>
					</div>

					<div className="rounded-2xl border border-dashed border-(--border-soft) bg-neutral-50/80 p-4 dark:bg-neutral-950/20">
						<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
								Required checklist
							</p>
							<p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
								{missingRequiredDocuments.length
									? `${missingRequiredDocuments.length} still needed`
									: "All required documents attached"}
							</p>
						</div>
						<div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
							{DOCUMENT_OPTIONS.filter((option) => option.required).map(
								(option) => {
									const complete = !missingRequiredDocuments.some(
										(document) => document.value === option.value,
									);
									return (
										<div
											key={option.value}
											className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
												complete
													? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200"
													: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200"
											}`}
										>
											{complete ? (
												<CheckCircleIcon
													className="h-4 w-4 shrink-0"
													aria-hidden="true"
												/>
											) : (
												<span
													className="h-2.5 w-2.5 shrink-0 rounded-full bg-current"
													aria-hidden="true"
												/>
											)}
											<span>
												{complete ? "Added" : "Needed"} - {option.label}
											</span>
										</div>
									);
								},
							)}
						</div>
					</div>

					{documents.length ? (
						<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
							{documents.map((document) => {
								const selectedOption = getDocumentOption(document.type);

								return (
									<div
										key={document.id}
										className="flex items-start justify-between gap-3 rounded-2xl border border-(--border-soft) bg-white/80 p-4 shadow-sm dark:bg-neutral-950/30"
									>
										<div className="flex min-w-0 items-start gap-3">
											<span
												className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
												aria-hidden="true"
											>
												<PaperClipIcon className="h-5 w-5" />
											</span>
											<div className="min-w-0">
												<div className="flex flex-wrap items-center gap-2">
													<p className="font-semibold text-neutral-950 dark:text-neutral-50">
														{selectedOption.label}
													</p>
													<span
														className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.1em] ${
															selectedOption.required
																? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
																: "bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
														}`}
													>
														{selectedOption.required ? "Required" : "Optional"}
													</span>
												</div>
												<p className="mt-1 truncate text-sm text-neutral-600 dark:text-neutral-400">
													{document.fileName}
												</p>
												<p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
													{formatFileSize(document.fileSize)}
												</p>
											</div>
										</div>
										<button
											type="button"
											onClick={() => handleRemoveDocument(document.id)}
											className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 transition-colors hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
											aria-label={`Remove ${selectedOption.label}`}
										>
											<TrashIcon className="h-5 w-5" aria-hidden="true" />
										</button>
									</div>
								);
							})}
						</div>
					) : (
						<div className="flex flex-col items-center justify-center rounded-2xl border border-(--border-soft) bg-neutral-50 p-6 text-center dark:bg-neutral-950/30">
							<DocumentPlusIcon
								className="h-10 w-10 text-neutral-400"
								aria-hidden="true"
							/>
							<p className="mt-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
								No documents attached yet
							</p>
							<p className="mt-1 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
								Use Add Document to attach required verification files and any
								optional supporting paperwork.
							</p>
						</div>
					)}

					<ScreenModal
						open={documentModalOpen}
						onClose={handleCloseDocumentModal}
						closeLabel="Close document upload"
						maxWidthClass="max-w-lg"
					>
						<div className="space-y-5 pt-8">
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">
									Application Attachment
								</p>
								<h3 className="mt-2 font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
									Add Document
								</h3>
								<p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
									Select the document type, attach the file, and it will be added
									to your application packet.
								</p>
							</div>

							<label className="space-y-1.5">
								<span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
									Document Type
								</span>
								<select
									value={documentDraft.type}
									onChange={(event) => {
										setDocumentDraft({ type: event.target.value, file: null });
										setDocumentDraftError("");
									}}
									className={inputClass}
								>
									{DOCUMENT_OPTIONS.map((option) => (
										<option
											key={option.value}
											value={option.value}
											disabled={
												option.required && attachedRequiredTypes.has(option.value)
											}
										>
											{option.label}
											{option.required ? " *" : ""}
										</option>
									))}
								</select>
							</label>

							<label className="space-y-1.5">
								<span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
									Attachment
								</span>
								<input
									key={`${documentModalOpen}-${documentDraft.type}`}
									type="file"
									className={inputClass}
									accept=".pdf,image/jpeg,image/png,image/webp"
									onChange={(event) => {
										setDocumentDraft((currentDraft) => ({
											...currentDraft,
											file: event.target.files?.[0] ?? null,
										}));
										setDocumentDraftError("");
									}}
								/>
							</label>

							{documentDraftError ? (
								<p className="text-sm font-semibold text-red-600">
									{documentDraftError}
								</p>
							) : null}

							<div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
								<button
									type="button"
									onClick={handleCloseDocumentModal}
									className="rounded-xl border border-(--border-soft) px-4 py-2.5 text-sm font-bold text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={handleAttachDocument}
									className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-bold text-neutral-50 transition hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-950 dark:hover:bg-neutral-200"
								>
									<PlusIcon className="h-5 w-5" aria-hidden="true" />
									Attach Document
								</button>
							</div>
						</div>
					</ScreenModal>
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
						credit approval. It should match the principal owner listed above.
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
