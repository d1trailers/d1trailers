"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";

export default function Login() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState("");

	async function handleSubmit(e) {
		e.preventDefault();
		setLoading(true);

		await fetch("/api/auth/send-magic-link", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		});

		setSent(true);
		setLoading(false);
	}

	return (
		<div className="flex min-h-screen w-full items-center justify-center p-5">
			<Card className="w-full max-w-lg bg-neutral-200 dark:bg-neutral-800 shadow-sm p-8 gap-10">
				<section className="space-y-2">
					<h2 className="text-2xl font-bold">Client Portal</h2>
					<p className="text-sm text-neutral-600 dark:text-neutral-400">
						Enter the email associated with your rental. We’ll send you a secure
						login link.
					</p>
				</section>

				{!sent ? (
					<form onSubmit={handleSubmit} className="space-y-4">
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="Email address"
							required
							className="w-full p-4 rounded-xl bg-neutral-100 dark:bg-neutral-700 border focus:ring-2 focus:ring-(--branding-700)"
						/>

						<button
							disabled={loading}
							className="w-full bg-neutral-900 hover:bg-neutral-950 text-neutral-50 py-4 rounded-xl font-bold transition disabled:opacity-60"
						>
							{loading ? "Sending Link…" : "Access Portal"}
						</button>

						{error && (
							<p className="text-sm text-red-600 font-medium">{error}</p>
						)}
					</form>
				) : (
					<div className="text-center space-y-3">
						<p className="font-semibold">Check your email</p>
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							We’ve sent a secure login link to <strong>{email}</strong>.
						</p>
					</div>
				)}

				<div className="text-center text-sm font-semibold space-y-2">
					<a className="block underline">Already have a Stripe billing link?</a>
					<a className="block underline">Need help accessing your portal?</a>
				</div>
			</Card>
		</div>
	);
}
