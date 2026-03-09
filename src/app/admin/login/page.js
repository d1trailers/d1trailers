"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";

export default function AdminLoginPage() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState("");

	async function handleSubmit(event) {
		event.preventDefault();
		setLoading(true);
		setError("");

		try {
			const res = await fetch("/api/admin/send-magic-link", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});

			const json = await res.json().catch(() => ({}));
			if (!res.ok) {
				setError(json?.error || "Failed to request admin login link");
				setLoading(false);
				return;
			}

			setSent(true);
			setLoading(false);
		} catch {
			setError("Failed to request admin login link");
			setLoading(false);
		}
	}

	return (
		<div className="flex min-h-screen w-full items-center justify-center p-5">
			<Card className="w-full max-w-lg bg-neutral-200 dark:bg-neutral-800 shadow-sm p-8 gap-8">
				<section className="space-y-2">
					<h2 className="text-2xl font-bold">Admin Login</h2>
					<p className="text-sm text-neutral-600 dark:text-neutral-400">
						Enter your owner/admin email to receive a secure magic link.
					</p>
				</section>

				{!sent ? (
					<form onSubmit={handleSubmit} className="space-y-4">
						<input
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							placeholder="Admin email"
							required
							className="w-full p-4 rounded-xl bg-neutral-100 dark:bg-neutral-700 border focus:ring-2 focus:ring-(--branding-700)"
						/>

						<button
							disabled={loading}
							className="w-full bg-neutral-900 hover:bg-neutral-950 text-neutral-50 py-4 rounded-xl font-bold transition disabled:opacity-60"
						>
							{loading ? "Sending Link..." : "Send Admin Link"}
						</button>

						{error ? (
							<p className="text-sm text-red-600 font-medium">{error}</p>
						) : null}
					</form>
				) : (
					<div className="text-center space-y-3">
						<p className="font-semibold">Check your email</p>
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							If authorized, a secure admin login link has been sent.
						</p>
					</div>
				)}
			</Card>
		</div>
	);
}
