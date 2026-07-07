"use client";

import { useEffect, useState } from "react";
import ScreenModal from "@/components/ui/ScreenModal";
import ActionButton from "@/components/ui/ActionButton";
import StatusBadge from "@/components/admin/StatusBadge";

function sortDocuments(documents = []) {
	return [...documents].sort((left, right) => {
		if ((left.sortOrder ?? 100) !== (right.sortOrder ?? 100)) {
			return (left.sortOrder ?? 100) - (right.sortOrder ?? 100);
		}
		return String(left.documentName).localeCompare(String(right.documentName));
	});
}

export default function DocuSignSigningModal({
	open,
	onClose,
	packet,
	recipientViewUrl,
	onPacketUpdate,
}) {
	const [currentPacket, setCurrentPacket] = useState(packet);
	const [viewUrl, setViewUrl] = useState(recipientViewUrl || "");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		setCurrentPacket(packet);
		setViewUrl(recipientViewUrl || "");
		setError("");
	}, [packet, recipientViewUrl]);

	useEffect(() => {
		if (!open || !currentPacket?.id) return;

		async function refreshPacket() {
			try {
				const response = await fetch(`/api/account/signing-packets/${currentPacket.id}`);
				const json = await response.json().catch(() => ({}));
				if (!response.ok) return;
				if (json?.packet) {
					setCurrentPacket(json.packet);
					onPacketUpdate?.(json.packet);
					if (
						json.packet.status === "completed" &&
						json.packet.billingActivationStatus === "completed" &&
						json.packet.billingCheckoutUrl
					) {
						window.location.href = json.packet.billingCheckoutUrl;
					}
				}
			} catch {
				// Polling is best-effort; explicit errors stay user-triggered.
			}
		}

		const interval = window.setInterval(refreshPacket, 4000);
		return () => window.clearInterval(interval);
	}, [currentPacket?.id, onPacketUpdate, open]);

	useEffect(() => {
		if (!open) return;

		function handleMessage(event) {
			if (event.origin !== window.location.origin) return;
			if (event.data?.type !== "d1trailers:docusign-return") return;
			if (event.data?.packetId && event.data.packetId !== currentPacket?.id) return;
			refreshStatus();
		}

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	});

	async function refreshStatus() {
		if (!currentPacket?.id) return;
		setLoading(true);
		setError("");
		try {
			const response = await fetch(`/api/account/signing-packets/${currentPacket.id}`);
			const json = await response.json().catch(() => ({}));
			if (!response.ok) {
				setError(typeof json?.error === "string" ? json.error : "Unable to refresh signing status.");
				setLoading(false);
				return;
			}
			setCurrentPacket(json.packet);
			onPacketUpdate?.(json.packet);
			if (json.packet?.billingCheckoutUrl) {
				window.location.href = json.packet.billingCheckoutUrl;
			}
		} catch {
			setError("Unable to refresh signing status.");
		} finally {
			setLoading(false);
		}
	}

	async function refreshSigningLink() {
		if (!currentPacket?.id) return;
		setLoading(true);
		setError("");
		try {
			const response = await fetch(
				`/api/account/signing-packets/${currentPacket.id}/recipient-view`,
				{ method: "POST" },
			);
			const json = await response.json().catch(() => ({}));
			if (!response.ok) {
				setError(typeof json?.error === "string" ? json.error : "Unable to refresh signing link.");
				setLoading(false);
				return;
			}
			setViewUrl(json.recipientViewUrl || "");
		} catch {
			setError("Unable to refresh signing link.");
		} finally {
			setLoading(false);
		}
	}

	const documents = sortDocuments(currentPacket?.documents || []);
	const documentCount = currentPacket?.documentCount || documents.length || 0;
	const completed = currentPacket?.status === "completed";
	const blocked = ["declined", "voided", "failed"].includes(currentPacket?.status);

	return (
		<ScreenModal
			open={open}
			onClose={onClose}
			closeLabel="Close signing"
			maxWidthClass="max-w-7xl"
		>
			<div className="space-y-5">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p className="text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
							Rental Documents
						</p>
						<h2 className="font-syne text-3xl font-bold text-neutral-950 dark:text-neutral-50">
							Review and Sign
						</h2>
						<p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
							{documentCount} form{documentCount === 1 ? "" : "s"} required for this rental approval.
						</p>
					</div>
					<StatusBadge status={currentPacket?.status || "Pending"} />
				</div>

				<div className="grid gap-4 lg:grid-cols-[280px_1fr]">
					<aside className="space-y-3 rounded-2xl border border-(--border-soft) bg-white/80 p-4 dark:bg-neutral-950/50">
						<p className="text-sm font-bold text-neutral-950 dark:text-neutral-50">
							Signing packet
						</p>
						<div className="space-y-2">
							{documents.length ? documents.map((document, index) => (
								<div key={document.id} className="rounded-xl border border-(--border-soft) p-3">
									<p className="text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
										Form {index + 1} of {documentCount}
									</p>
									<p className="mt-1 text-sm font-semibold text-neutral-950 dark:text-neutral-50">
										{document.documentName}
									</p>
									<p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
										{document.status || "pending"}
									</p>
								</div>
							)) : (
								<p className="text-sm text-neutral-600 dark:text-neutral-400">
									Forms will appear after the packet is prepared.
								</p>
							)}
						</div>
						<div className="flex flex-col gap-2 pt-2">
							<ActionButton type="button" tone="primary" onClick={refreshSigningLink} disabled={loading || completed || blocked}>
								Refresh Signing Link
							</ActionButton>
							<ActionButton type="button" tone="primary" onClick={refreshStatus} disabled={loading}>
								Refresh Status
							</ActionButton>
						</div>
					</aside>

					<section className="min-h-[680px] overflow-hidden rounded-2xl border border-(--border-soft) bg-neutral-100 dark:bg-neutral-950/70">
						{viewUrl && !completed && !blocked ? (
							<iframe
								title="DocuSign embedded signing"
								src={viewUrl}
								className="h-[680px] w-full bg-white"
								allow="fullscreen"
							/>
						) : (
							<div className="flex min-h-[680px] items-center justify-center p-6 text-center">
								<div className="max-w-md space-y-3">
									<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
										{completed ? "Signing complete" : blocked ? "Signing unavailable" : "Signing link pending"}
									</h3>
									<p className="text-sm text-neutral-600 dark:text-neutral-400">
										{completed
											? "We are storing the signed documents and preparing billing."
											: blocked
												? currentPacket?.errorMessage || "This signing packet is no longer active."
												: "Refresh the signing link to continue."}
									</p>
								</div>
							</div>
						)}
					</section>
				</div>

				{currentPacket?.billingErrorMessage ? (
					<p className="text-sm font-medium text-red-600">{currentPacket.billingErrorMessage}</p>
				) : null}
				{error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
			</div>
		</ScreenModal>
	);
}
