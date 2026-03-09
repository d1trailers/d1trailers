"use client";

import { EnvelopeIcon, PhoneIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { useState } from "react";
import Card from "../ui/Card";

export default function Footer() {
	return (
		<footer className="p-5 md:px-12 lg:px-20 pb-12">
			<div className="surface-panel rounded-2xl p-6 md:p-8 flex flex-col gap-10">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
				<FooterColumn title="Contact Us">
					<div className="flex flex-col gap-3 mt-4 font-semibold">
						<div className="flex items-center gap-3">
							<PhoneIcon className="w-5 h-5 text-(--branding-700)" />
							<a
								href="tel:4693191226"
								className="hover:text-(--branding-700) transition"
							>
								469.319.1226
							</a>
						</div>
						<div className="flex items-center gap-3">
							<EnvelopeIcon className="w-5 h-5 text-(--branding-700)" />
							<a
								href="mailto:inquiries@d1trailers.com"
								className="hover:text-(--branding-700) transition"
							>
								inquiries@d1trailers.com
							</a>
						</div>
					</div>
				</FooterColumn>

				<FooterColumn title="Quick Links">
					<div className="flex flex-col gap-2 mt-4 font-semibold">
						<Link href="/" className="hover:text-(--branding-700) transition">
							Home
						</Link>
						<Link href="/policy" className="hover:text-(--branding-700) transition">
							Policy
						</Link>
						<Link href="/apply" className="hover:text-(--branding-700) transition">
							Apply
						</Link>
						<Link href="/login" className="hover:text-(--branding-700) transition">
							Portal Login
						</Link>
						<a href="/sitemap.xml" className="hover:text-(--branding-700) transition">
							Site Map
						</a>
					</div>
				</FooterColumn>

				<FooterColumn title="Get In Touch">
					<div className="mt-4">
						<FooterCard />
					</div>
				</FooterColumn>
				</div>

				<p className="w-full text-center text-sm md:text-base text-neutral-600 dark:text-neutral-400">
					&copy; {new Date().getFullYear()}{" "}
					<span className="font-syne italic font-bold">RHE ENTERPRISES</span>, LLC
				</p>
			</div>
		</footer>
	);
}

function FooterColumn({ title, children }) {
	return (
		<section className="flex flex-col w-full">
			<h3 className="font-bold text-lg border-b border-(--border-soft) pb-2">
				{title}
			</h3>
			{children}
		</section>
	);
}

function FooterCard() {
	const [formData, setFormData] = useState({
		firstName: "",
		lastName: "",
		email: "",
		duration: "",
		typeOfUse: "Transport",
		phone: "",
		companyName: "",
		referral: "",
	});

	const handleChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value });
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		console.log("Form Submitted:", formData);
	};

	const inputClass =
		"p-3 border border-(--border-soft) rounded-lg bg-neutral-50 dark:bg-neutral-900/40 focus:outline-none focus:ring-2 focus:ring-(--branding-700)";

	return (
		<Card className="surface-subtle w-full p-5 rounded-xl">
			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<input
						type="text"
						name="firstName"
						value={formData.firstName}
						onChange={handleChange}
						placeholder="First Name"
						className={inputClass}
						required
					/>
					<input
						type="text"
						name="lastName"
						value={formData.lastName}
						onChange={handleChange}
						placeholder="Last Name"
						className={inputClass}
						required
					/>
				</div>

				<input
					type="email"
					name="email"
					value={formData.email}
					onChange={handleChange}
					placeholder="Email"
					className={inputClass}
					required
				/>

				<input
					type="text"
					name="duration"
					value={formData.duration}
					onChange={handleChange}
					placeholder="Duration of Rental * Required"
					className={inputClass}
					required
				/>

				<select
					name="typeOfUse"
					value={formData.typeOfUse}
					onChange={handleChange}
					className={`${inputClass} text-neutral-950 dark:text-neutral-50`}
					required
				>
					<option value="Transport">Transport / On Road Use</option>
					<option value="Storage">Storage</option>
				</select>

				<input
					type="text"
					name="phone"
					value={formData.phone}
					onChange={handleChange}
					placeholder="Phone"
					className={inputClass}
				/>

				<input
					type="text"
					name="companyName"
					value={formData.companyName}
					onChange={handleChange}
					placeholder="Company Name"
					className={inputClass}
				/>

				<input
					type="text"
					name="referral"
					value={formData.referral}
					onChange={handleChange}
					placeholder="How did you hear about us?"
					className={inputClass}
				/>

				<button
					type="submit"
					className="bg-(--branding-700) text-neutral-50 py-3 rounded-lg hover:bg-(--branding-800) transition-colors duration-200 font-bold"
				>
					Submit
				</button>
			</form>
		</Card>
	);
}
