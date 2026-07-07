"use client";

import { Suspense } from "react";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

function DocuSignReturnContent() {
	const searchParams = useSearchParams();
	const packetId = searchParams.get("packet") || "";
	const event = searchParams.get("event") || "returned";

	useEffect(() => {
		window.parent?.postMessage(
			{
				type: "d1trailers:docusign-return",
				packetId,
				event,
			},
			window.location.origin
		);
	}, [event, packetId]);

	return (
		<main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-neutral-50">
			<div className="max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 text-center shadow-2xl">
				<p className="text-xs uppercase tracking-[0.18em] text-neutral-300">
					DocuSign
				</p>
				<h1 className="mt-3 font-syne text-3xl font-bold">Signing Complete</h1>
				<p className="mt-3 text-sm leading-relaxed text-neutral-300">
					You can return to the D1Trailers window. We are finalizing the rental documents now.
				</p>
			</div>
		</main>
	);
}

export default function DocuSignReturnPage() {
	return (
		<Suspense fallback={null}>
			<DocuSignReturnContent />
		</Suspense>
	);
}
