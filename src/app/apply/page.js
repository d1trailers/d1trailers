"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";

const REQUIRED_DOCS = [
	"Utility Bill (1 of 2)",
	"Utility Bill (2 of 2)",
	"Driver License (Front)",
	"Driver License (Back)",
	"Tractor License Plate Photo",
];

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
	const [formData, setFormData] = useState({});

	const inputClass =
		"w-full p-3 rounded-lg border border-(--border-soft) bg-neutral-50 dark:bg-neutral-900/40 text-neutral-950 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-(--branding-700)";

	const sectionClass = "surface-panel rounded-2xl p-5 md:p-6 space-y-4";

	const handleChange = (event) => {
		const { name, value, type, files, checked } = event.target;
		setFormData((current) => ({
			...current,
			[name]: type === "file" ? files : type === "checkbox" ? checked : value,
		}));
	};

	const handleSubmit = (event) => {
		event.preventDefault();
		console.log("Application Submitted:", formData);
	};

	return (
		<Card className="surface-panel w-full p-0 overflow-hidden">
			<form onSubmit={handleSubmit} className="flex flex-col gap-5 p-5 md:p-8">
				<section className={sectionClass}>
					<SectionTitle title="Owner Information" />
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<input
							name="ownerFirstName"
							placeholder="Principal Owner First Name"
							className={inputClass}
							required
						/>
						<input
							name="ownerLastName"
							placeholder="Principal Owner Last Name"
							className={inputClass}
							required
						/>
						<input
							name="partnerFirstName"
							placeholder="Partner First Name (optional)"
							className={inputClass}
						/>
						<input
							name="partnerLastName"
							placeholder="Partner Last Name (optional)"
							className={inputClass}
						/>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<input
							type="email"
							name="email"
							placeholder="Email"
							className={inputClass}
							required
						/>
						<input
							name="phone"
							placeholder="Phone"
							className={inputClass}
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
					/>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<input name="ownerCity" placeholder="City" className={inputClass} />
						<input
							name="ownerRegion"
							placeholder="Country / Region"
							className={inputClass}
						/>
						<input
							name="ownerZip"
							placeholder="Zip / Postal Code"
							className={inputClass}
						/>
					</div>
				</section>

				<section className={sectionClass}>
					<SectionTitle title="Company Information" />
					<input
						name="companyName"
						placeholder="Company Name *"
						className={inputClass}
						required
					/>
					<input
						name="companyAddress"
						placeholder="Street Address"
						className={inputClass}
					/>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<input
							name="companyCity"
							placeholder="City"
							className={inputClass}
						/>
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
							placeholder="Federal Tax ID (EIN) *"
							className={inputClass}
							required
						/>
						<input
							name="mcNumber"
							placeholder="MC Number *"
							className={inputClass}
							required
						/>
						<input
							name="usdot"
							placeholder="USDOT Number *"
							className={inputClass}
							required
						/>
					</div>
					<input
						name="rentalDuration"
						placeholder="Duration of Rental *"
						className={inputClass}
						required
					/>
				</section>

				<section className={sectionClass}>
					<SectionTitle title="Required Documents" />
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{REQUIRED_DOCS.map((label, index) => (
							<label
								key={label}
								className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300"
							>
								<span>{label}</span>
								<input
									type="file"
									name={`file_${index}`}
									onChange={handleChange}
									className={inputClass}
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
								/>
							</div>
						))}
					</div>
				</section>

				<section className={sectionClass}>
					<SectionTitle title="Identity Verification" />
					<input
						name="ssn"
						placeholder="Social Security Number *"
						className={inputClass}
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

				<button
					type="submit"
					className="mt-2 rounded-xl bg-(--branding-700) hover:bg-(--branding-800) transition-colors text-neutral-50 py-4 font-bold text-base md:text-lg"
				>
					Submit Application
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
