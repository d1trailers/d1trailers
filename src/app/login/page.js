"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";

function LoadingSpinner() {
	return (
		<span
			className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-neutral-50 border-t-transparent"
			aria-hidden="true"
		/>
	);
}

export default function Login() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState("");
	const [actionLink, setActionLink] = useState("");

	async function handleSubmit(event) {
		event.preventDefault();
		setLoading(true);
		setError("");
		setSent(false);
		setActionLink("");

		try {
			const response = await fetch("/api/auth/request-login-link", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email,
				}),
			});
			const json = await response.json().catch(() => ({}));

			if (!response.ok) {
				setError(
					typeof json?.error === "string"
						? json.error
						: "Failed to send login link."
				);
				setLoading(false);
				return;
			}

			setActionLink(typeof json?.actionLink === "string" ? json.actionLink : "");
			setSent(true);
			setLoading(false);
		} catch {
			setError("Failed to send login link.");
			setLoading(false);
		}
	}

	return (
		<div className="flex min-h-screen w-full items-center justify-center p-5">
			<Card className="w-full max-w-lg p-8 gap-8">
				<section className="space-y-2">
					<p className="text-xs uppercase tracking-[0.14em] text-neutral-600 dark:text-neutral-400">
						Account Access
					</p>
					<h2 className="text-2xl font-bold">Login</h2>
					<p className="text-sm text-neutral-600 dark:text-neutral-400">
						Enter your email to receive a secure magic link.
					</p>
					<p className="text-xs text-neutral-500 dark:text-neutral-400">
						Use the most recent email you receive. Links expire automatically for security.
					</p>
				</section>

				{!sent ? (
					<form onSubmit={handleSubmit} className="space-y-4">
						<input
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							placeholder="Email address"
							required
							className="w-full p-4 rounded-xl border border-(--border-soft) bg-neutral-50 dark:bg-neutral-900/40 focus:ring-2 focus:ring-(--branding-700)"
						/>

						<button
							type="submit"
							disabled={loading}
							className="w-full bg-(--branding-700) hover:bg-(--branding-800) text-neutral-50 py-4 rounded-xl font-bold transition disabled:opacity-60 flex items-center justify-center"
						>
							{loading ? (
								<>
									<LoadingSpinner />
									<span className="sr-only">Sending magic link</span>
								</>
							) : (
								"Send Login Link"
							)}
						</button>

						{error ? <p className="text-sm text-red-600 font-medium">{error}</p> : null}
					</form>
				) : (
					<div className="text-center space-y-3">
						<p className="font-semibold">Check your email</p>
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							If this email is recognized in the system, a secure login link has been sent.
						</p>
						{actionLink ? (
							<div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-left dark:border-amber-800/60 dark:bg-amber-950/20">
								<p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
									Temporary login link
								</p>
								<p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
									Email delivery is not active yet, so you can use this access link directly for now.
								</p>
								<a
									href={actionLink}
									className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-(--branding-700) px-4 py-3 text-sm font-bold text-neutral-50 transition hover:bg-(--branding-800)"
								>
									Open Login Link
								</a>
								<p className="mt-3 break-all rounded-xl bg-white/80 px-3 py-2 font-mono text-xs text-neutral-700 dark:bg-neutral-950/60 dark:text-neutral-200">
									{actionLink}
								</p>
							</div>
						) : null}
					</div>
				)}
			</Card>
		</div>
	);
}
