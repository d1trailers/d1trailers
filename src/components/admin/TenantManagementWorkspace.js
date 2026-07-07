"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	ChevronRightIcon,
} from "@heroicons/react/24/outline";
import Card from "@/components/ui/Card";
import StateCard from "@/components/admin/StateCard";
import StatusBadge from "@/components/admin/StatusBadge";
import { LoadingCardGrid, LoadingPanel } from "@/components/ui/LoadingSkeleton";
import TenantManagementModal from "@/components/admin/TenantManagementModal";
import RentalManagementModal from "@/components/admin/RentalManagementModal";
import TrailerManagementModal from "@/components/admin/TrailerManagementModal";
import { JOURNEY_ITEM_KEYS } from "@/lib/contracts/journey";
import SectionHeaderCard from "@/components/portal/SectionHeaderCard";
import SearchInput from "@/components/portal/SearchInput";

const GROUP_CONFIG = {
	active: {
		label: "Active Accounts",
		description: "Tenant accounts with at least one live agreement.",
	},
	suspended: {
		label: "Suspended Accounts",
		description: "Tenant accounts currently suspended because of agreement-level billing issues.",
	},
	stale: {
		label: "Stale Accounts",
		description: "Tenant accounts with no live agreements. Drafts and negotiations still live on their rentals.",
	},
	other: {
		label: "Other",
		description: "Accounts outside the standard workflow buckets.",
	},
};

const TAB_IDS = new Set(["rentals", "trailers"]);

function formatDate(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString();
}

function TenantRecordCard({ tenant, onClick }) {
	return (
		<button
			type="button"
			onClick={() => onClick(tenant.id)}
			className="w-full rounded-2xl border border-(--border-soft) bg-white/80 p-4 text-left transition hover:border-(--branding-700) hover:bg-white dark:bg-neutral-950/60"
		>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="font-semibold text-neutral-950 dark:text-neutral-50">
						{tenant.displayName}
					</p>
					<p className="text-sm text-neutral-600 dark:text-neutral-400">
						Account Owner: {tenant.primaryEmail}
					</p>
					<p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
						{tenant.primaryPhone || "No phone on file"} | Updated {formatDate(tenant.updatedAt)}
					</p>
				</div>
				<div className="flex flex-wrap justify-end gap-2">
					<StatusBadge status={tenant.status} />
					{tenant.latestApplication ? (
						<StatusBadge status={tenant.latestApplication.status} />
					) : null}
				</div>
			</div>
			<div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400">
				<div className="flex flex-wrap gap-3">
					<span>{tenant.rentalCount} rental(s)</span>
					<span>{tenant.communicationCount} communication(s)</span>
					<span>{tenant.pendingTimelineCount} pending action(s)</span>
				</div>
				<span className="inline-flex items-center gap-1 font-semibold text-(--branding-700)">
					Open management
					<ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
				</span>
			</div>
		</button>
	);
}

export default function TenantManagementWorkspace() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const initialTenantId = searchParams.get("tenant") || "";
	const initialTab = TAB_IDS.has(searchParams.get("tab"))
		? searchParams.get("tab")
		: "rentals";

	const [tenants, setTenants] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTenantId, setSelectedTenantId] = useState(initialTenantId);
	const [activeTab, setActiveTab] = useState(initialTab);
	const [detailsByTenantId, setDetailsByTenantId] = useState({});
	const [detailLoadingByTenantId, setDetailLoadingByTenantId] = useState({});
	const [detailErrorByTenantId, setDetailErrorByTenantId] = useState({});
	const [trailerCatalog, setTrailerCatalog] = useState([]);

	const [rentalModalOpen, setRentalModalOpen] = useState(false);
	const [rentalModalMode, setRentalModalMode] = useState("edit");
	const [selectedRentalId, setSelectedRentalId] = useState("");
	const [rentalDetail, setRentalDetail] = useState(null);
	const [rentalDetailLoading, setRentalDetailLoading] = useState(false);
	const [rentalDetailError, setRentalDetailError] = useState("");
	const [rentalActionLoading, setRentalActionLoading] = useState(false);
	const [rentalDeleteLoading, setRentalDeleteLoading] = useState(false);
	const [rentalActionError, setRentalActionError] = useState("");

	const [trailerModalOpen, setTrailerModalOpen] = useState(false);
	const [selectedTrailerId, setSelectedTrailerId] = useState("");
	const [trailerDetail, setTrailerDetail] = useState(null);
	const [trailerDetailLoading, setTrailerDetailLoading] = useState(false);
	const [trailerDetailError, setTrailerDetailError] = useState("");
	const [trailerActionLoading, setTrailerActionLoading] = useState(false);
	const [trailerActionError, setTrailerActionError] = useState("");

	function syncLocation(tenantId, tabId = "rentals") {
		const params = new URLSearchParams(searchParams.toString());
		if (tenantId) {
			params.set("tenant", tenantId);
			if (tabId && tabId !== "rentals") {
				params.set("tab", tabId);
			} else {
				params.delete("tab");
			}
		} else {
			params.delete("tenant");
			params.delete("tab");
		}
		router.replace(`/admin/management${params.toString() ? `?${params.toString()}` : ""}`);
	}

	function selectTenant(tenantId, nextTab = "rentals") {
		setSelectedTenantId(tenantId);
		setActiveTab(nextTab);
		syncLocation(tenantId, nextTab);
	}

	function closeRentalModal() {
		setRentalModalOpen(false);
		setSelectedRentalId("");
		setRentalDetail(null);
		setRentalDetailError("");
		setRentalActionError("");
	}

	function closeTrailerModal() {
		setTrailerModalOpen(false);
		setSelectedTrailerId("");
		setTrailerDetail(null);
		setTrailerDetailError("");
		setTrailerActionError("");
	}

	function closeTenantModal() {
		setSelectedTenantId("");
		setActiveTab("rentals");
		closeRentalModal();
		closeTrailerModal();
		syncLocation("", "rentals");
	}

	async function loadTenants() {
		try {
			const res = await fetch("/api/admin/tenants");
			const json = await res.json().catch(() => []);

			if (!res.ok) {
				setError(
					typeof json?.error === "string"
						? json.error
						: "Failed to load management tenants."
				);
				setLoading(false);
				return;
			}

			const nextTenants = Array.isArray(json) ? json : [];
			setTenants(nextTenants);
			setError("");
			setLoading(false);

			if (selectedTenantId && !nextTenants.some((tenant) => tenant.id === selectedTenantId)) {
				closeTenantModal();
			}
		} catch {
			setError("Failed to load management tenants.");
			setLoading(false);
		}
	}

	async function loadTrailerCatalog() {
		try {
			const res = await fetch("/api/admin/trailers", { cache: "no-store" });
			const json = await res.json().catch(() => []);
			if (!res.ok) {
				return;
			}

			setTrailerCatalog(Array.isArray(json) ? json : []);
		} catch {}
	}

	async function loadTenantDetail(tenantId, { force = false } = {}) {
		if (!tenantId) return;
		if (detailLoadingByTenantId[tenantId]) return;
		if (!force && detailsByTenantId[tenantId]) return;

		setDetailLoadingByTenantId((current) => ({ ...current, [tenantId]: true }));
		setDetailErrorByTenantId((current) => ({ ...current, [tenantId]: "" }));

		try {
			const res = await fetch(`/api/admin/tenants/${encodeURIComponent(tenantId)}`);
			const json = await res.json().catch(() => ({}));

			if (!res.ok) {
				setDetailErrorByTenantId((current) => ({
					...current,
					[tenantId]:
						typeof json?.error === "string"
							? json.error
							: "Failed to load tenant details.",
				}));
				setDetailLoadingByTenantId((current) => ({ ...current, [tenantId]: false }));
				return;
			}

			setDetailsByTenantId((current) => ({ ...current, [tenantId]: json }));
			setDetailLoadingByTenantId((current) => ({ ...current, [tenantId]: false }));
		} catch {
			setDetailErrorByTenantId((current) => ({
				...current,
				[tenantId]: "Failed to load tenant details.",
			}));
			setDetailLoadingByTenantId((current) => ({ ...current, [tenantId]: false }));
		}
	}

	async function loadRentalDetail(rentalId) {
		if (!rentalId) return;
		setRentalDetailLoading(true);
		setRentalDetailError("");

		try {
			const res = await fetch(`/api/admin/rentals/${encodeURIComponent(rentalId)}`);
			const json = await res.json().catch(() => ({}));
			if (!res.ok) {
				setRentalDetailError(
					typeof json?.error === "string"
						? json.error
						: "Failed to load rental detail."
				);
				setRentalDetailLoading(false);
				return;
			}

			setRentalDetail(json);
			setRentalDetailLoading(false);
		} catch {
			setRentalDetailError("Failed to load rental detail.");
			setRentalDetailLoading(false);
		}
	}

	async function loadTrailerDetail(trailerId) {
		if (!trailerId) return;
		setTrailerDetailLoading(true);
		setTrailerDetailError("");

		try {
			const res = await fetch(`/api/admin/trailers/${encodeURIComponent(trailerId)}`);
			const json = await res.json().catch(() => ({}));
			if (!res.ok) {
				setTrailerDetailError(
					typeof json?.error === "string"
						? json.error
						: "Failed to load trailer detail."
				);
				setTrailerDetailLoading(false);
				return;
			}

			setTrailerDetail(json);
			setTrailerDetailLoading(false);
		} catch {
			setTrailerDetailError("Failed to load trailer detail.");
			setTrailerDetailLoading(false);
		}
	}

	useEffect(() => {
		const frame = window.requestAnimationFrame(() => {
			void Promise.all([loadTenants(), loadTrailerCatalog()]);
		});

		return () => window.cancelAnimationFrame(frame);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!selectedTenantId) return;
		const frame = window.requestAnimationFrame(() => {
			void loadTenantDetail(selectedTenantId);
		});
		return () => window.cancelAnimationFrame(frame);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedTenantId]);

	const filteredTenants = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return tenants;
		return tenants.filter((tenant) =>
			[
				tenant.displayName,
				tenant.primaryEmail,
				tenant.primaryPhone,
				tenant.status,
				tenant.latestApplication?.status,
			]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(query))
		);
	}, [searchQuery, tenants]);

	const groupedTenants = useMemo(() => {
		const groups = {
			active: [],
			suspended: [],
			stale: [],
			other: [],
		};

		for (const tenant of filteredTenants) {
			const groupKey = GROUP_CONFIG[tenant.group] ? tenant.group : "other";
			groups[groupKey].push(tenant);
		}

		return groups;
	}, [filteredTenants]);

	const selectedDetail = selectedTenantId ? detailsByTenantId[selectedTenantId] || null : null;
	const availableTrailerOptions = trailerCatalog.filter((trailer) => trailer.status === "available");

	async function refreshTenant(tenantId) {
		await Promise.all([loadTenants(), loadTenantDetail(tenantId, { force: true }), loadTrailerCatalog()]);
	}

	function openCreateRentalModal() {
		setRentalModalMode("create");
		setSelectedRentalId("");
		setRentalDetail(null);
		setRentalActionError("");
		setRentalModalOpen(true);
	}

	function openRentalModal(rentalId) {
		setRentalModalMode("edit");
		setSelectedRentalId(rentalId);
		setRentalDetail(null);
		setRentalActionError("");
		setRentalModalOpen(true);
		void loadRentalDetail(rentalId);
	}

	function openTrailerModal(trailerId) {
		setSelectedTrailerId(trailerId);
		setTrailerDetail(null);
		setTrailerActionError("");
		setTrailerModalOpen(true);
		void loadTrailerDetail(trailerId);
	}

	async function handleRentalSubmit(payload) {
		setRentalActionLoading(true);
		setRentalActionError("");

		try {
			const res =
				rentalModalMode === "create"
					? await fetch("/api/admin/rentals", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								...payload,
								tenantId: selectedTenantId,
							}),
					  })
					: await fetch(`/api/admin/rentals/${encodeURIComponent(selectedRentalId)}`, {
							method: "PATCH",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify(payload),
					  });
			const json = await res.json().catch(() => ({}));

			if (!res.ok) {
				setRentalActionError(
					typeof json?.error === "string" ? json.error : "Failed to save rental."
				);
				setRentalActionLoading(false);
				return;
			}

			setRentalActionLoading(false);
			await refreshTenant(selectedTenantId);
			if (rentalModalMode === "edit" && selectedRentalId) {
				await loadRentalDetail(selectedRentalId);
			} else {
				closeRentalModal();
			}
		} catch {
			setRentalActionError("Failed to save rental.");
			setRentalActionLoading(false);
		}
	}

	async function handleRentalDelete() {
		if (!selectedRentalId) return;
		setRentalDeleteLoading(true);
		setRentalActionError("");

		try {
			const res = await fetch(`/api/admin/rentals/${encodeURIComponent(selectedRentalId)}`, {
				method: "DELETE",
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok) {
				setRentalActionError(
					typeof json?.error === "string" ? json.error : "Failed to delete rental."
				);
				setRentalDeleteLoading(false);
				return;
			}

			setRentalDeleteLoading(false);
			await refreshTenant(selectedTenantId);
			closeRentalModal();
		} catch {
			setRentalActionError("Failed to delete rental.");
			setRentalDeleteLoading(false);
		}
	}

	async function handleRemoveRentalAssignment(assignmentId) {
		if (!selectedRentalId) {
			return { error: "Select a rental first." };
		}

		try {
			const res = await fetch(
				`/api/admin/rentals/${encodeURIComponent(selectedRentalId)}/assignments/${encodeURIComponent(assignmentId)}`,
				{
					method: "DELETE",
				}
			);
			const json = await res.json().catch(() => ({}));
			if (!res.ok) {
				return {
					error:
						typeof json?.error === "string"
							? json.error
							: "Failed to remove the assignment.",
				};
			}

			await refreshTenant(selectedTenantId);
			await loadRentalDetail(selectedRentalId);
			return { ok: true };
		} catch {
			return { error: "Failed to remove the assignment." };
		}
	}

	async function handleUploadRentalDocument(formData) {
		if (!selectedRentalId) {
			return { error: "Select a rental first." };
		}

		try {
			const res = await fetch(
				`/api/admin/rentals/${encodeURIComponent(selectedRentalId)}/documents`,
				{
					method: "POST",
					body: formData,
				}
			);
			const json = await res.json().catch(() => ({}));
			if (!res.ok) {
				return {
					error:
						typeof json?.error === "string"
							? json.error
							: "Failed to upload document.",
				};
			}

			await refreshTenant(selectedTenantId);
			await loadRentalDetail(selectedRentalId);
			return { ok: true };
		} catch {
			return { error: "Failed to upload document." };
		}
	}

	async function handleTrailerSubmit(payload) {
		if (!selectedTrailerId) return;
		setTrailerActionLoading(true);
		setTrailerActionError("");

		try {
			const res = await fetch(`/api/admin/trailers/${encodeURIComponent(selectedTrailerId)}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok) {
				setTrailerActionError(
					typeof json?.error === "string" ? json.error : "Failed to save trailer."
				);
				setTrailerActionLoading(false);
				return;
			}

			setTrailerActionLoading(false);
			await refreshTenant(selectedTenantId);
			await loadTrailerDetail(selectedTrailerId);
		} catch {
			setTrailerActionError("Failed to save trailer.");
			setTrailerActionLoading(false);
		}
	}

	async function handleSendCommunication({
		tenantId,
		rentalId,
		applicationId,
		actionKey,
		subjectLine,
		message,
		stage,
		sendEmail,
	}) {
		try {
			if (actionKey === "general_update") {
				const res = await fetch(`/api/admin/tenants/${encodeURIComponent(tenantId)}/communication`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						subjectLine,
						message,
						applicationId,
						rentalId,
					}),
				});
				const json = await res.json().catch(() => ({}));
				if (!res.ok) {
					return {
						error:
							typeof json?.error === "string" ? json.error : "Failed to send update.",
					};
				}
			} else {
				if (!rentalId) {
					return {
						error: "A rental is required before timeline steps can be published.",
					};
				}

				const routeKey = {
					timeline_sign_documents: JOURNEY_ITEM_KEYS.signDocuments,
					timeline_review_contract: JOURNEY_ITEM_KEYS.reviewContract,
					timeline_pick_up_trailer: JOURNEY_ITEM_KEYS.pickUpTrailer,
				}[actionKey];

				const res = await fetch(
					`/api/admin/rentals/${encodeURIComponent(rentalId)}/timeline`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							itemKey: routeKey,
							stage,
							description: message,
							sendUpdateEmail: sendEmail,
						}),
					}
				);
				const json = await res.json().catch(() => ({}));
				if (!res.ok) {
					return {
						error:
							typeof json?.error === "string" ? json.error : "Failed to publish update.",
					};
				}
			}

			await refreshTenant(selectedTenantId);
			if (selectedRentalId) {
				await loadRentalDetail(selectedRentalId);
			}
			return { ok: true };
		} catch {
			return { error: "Failed to send update." };
		}
	}

	if (loading) {
		return (
			<div className="space-y-4">
				<LoadingPanel title="Loading Management" />
				<LoadingCardGrid count={4} />
			</div>
		);
	}

	if (error) {
		return <StateCard title="Management Unavailable" message={error} tone="error" />;
	}

	if (!tenants.length) {
		return (
			<StateCard
				title="No Tenants Yet"
				message="No tenant accounts are available."
			/>
		);
	}

	return (
		<>
			<div className="space-y-6">
				<SectionHeaderCard
					eyebrow="Management"
					title="Tenant Accounts"
					search={
						<SearchInput
							value={searchQuery}
							onChange={setSearchQuery}
							placeholder="Search by company, account owner email, phone, or status"
						/>
					}
				/>

				<div className="flex w-full flex-col gap-4">
					{Object.entries(GROUP_CONFIG).map(([groupKey, config]) => {
						const items = groupedTenants[groupKey] || [];
						return (
							<Card key={groupKey} className="h-full">
								<div className="space-y-4">
									<div>
										<div className="flex flex-wrap items-center gap-3">
											<p className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
												{config.label}
											</p>
											<StatusBadge status={`${items.length} total`} />
										</div>
										<p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
											{config.description}
										</p>
									</div>

									{items.length ? (
										<div className="space-y-3">
											{items.map((tenant) => (
												<TenantRecordCard
													key={tenant.id}
													tenant={tenant}
													onClick={selectTenant}
												/>
											))}
										</div>
									) : (
										<div className="rounded-2xl border border-dashed border-(--border-soft) p-4 text-sm text-neutral-600 dark:text-neutral-400">
											No tenants in this group{searchQuery ? " for the current search." : "."}
										</div>
									)}
								</div>
							</Card>
						);
					})}
				</div>
			</div>

			<TenantManagementModal
				open={Boolean(selectedTenantId)}
				onClose={closeTenantModal}
				detail={selectedDetail}
				loading={Boolean(selectedTenantId) && Boolean(detailLoadingByTenantId[selectedTenantId]) && !selectedDetail}
				error={detailErrorByTenantId[selectedTenantId] || ""}
				activeTab={activeTab}
				onTabChange={(tabId) => {
					setActiveTab(tabId);
					syncLocation(selectedTenantId, tabId);
				}}
				onCreateRental={openCreateRentalModal}
				onOpenRental={openRentalModal}
				onOpenTrailer={openTrailerModal}
			/>

			<RentalManagementModal
				open={rentalModalOpen}
				onClose={closeRentalModal}
				mode={rentalModalMode}
				detail={rentalDetail}
				loading={rentalDetailLoading}
				error={rentalDetailError}
				onSubmit={handleRentalSubmit}
				onDelete={handleRentalDelete}
				submitting={rentalActionLoading}
				deleting={rentalDeleteLoading}
				submitError={rentalActionError}
				onSendCommunication={handleSendCommunication}
				onRemoveAssignment={handleRemoveRentalAssignment}
				onUploadDocument={handleUploadRentalDocument}
				tenantOptions={
					selectedDetail
						? tenants.filter((tenant) => tenant.id === selectedDetail.tenant.id)
						: tenants
				}
				initialTenantId={selectedDetail?.tenant?.id || ""}
				availableTrailerOptions={availableTrailerOptions}
				maxWidthClass="max-w-7xl"
			/>

			<TrailerManagementModal
				open={trailerModalOpen}
				onClose={closeTrailerModal}
				mode="edit"
				detail={trailerDetail}
				loading={trailerDetailLoading}
				error={trailerDetailError}
				onSubmit={handleTrailerSubmit}
				submitting={trailerActionLoading}
				submitError={trailerActionError}
				assignableRentals={[]}
				maxWidthClass="max-w-7xl"
			/>
		</>
	);
}
