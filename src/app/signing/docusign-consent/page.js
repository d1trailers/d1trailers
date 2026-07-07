export default function DocuSignConsentPage() {
	return (
		<main className="grid min-h-screen place-items-center bg-neutral-950 p-6 text-neutral-50">
			<section className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/10 p-8 text-center shadow-2xl">
				<p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-300">
					DocuSign Consent
				</p>
				<h1 className="mt-3 font-syne text-3xl font-bold">
					Consent Granted
				</h1>
				<p className="mt-3 text-sm leading-relaxed text-neutral-300">
					DocuSign JWT consent has been returned to D1 Trailers. You can close this
					window and retry the signing action.
				</p>
			</section>
		</main>
	);
}
