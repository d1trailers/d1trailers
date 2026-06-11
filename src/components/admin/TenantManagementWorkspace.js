"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
	BuildingOffice2Icon,
	ChatBubbleLeftRightIcon,
	ChevronRightIcon,
	MagnifyingGlassIcon,
	SparklesIcon,
	UsersIcon,
} from "@heroicons/react/24/outline";
import Card from "@/components/ui/Card";
import StateCard from "@/components/admin/StateCard";
import StatusBadge from "@/components/admin/StatusBadge";
import { LoadingCardGrid, LoadingPanel } from "@/components/ui/LoadingSkeleton";
import TenantManagementModal from "@/components/admin/TenantManagementModal";
import { JOURNEY_ITEM_KEYS } from "@/lib/contracts/journey";

const GROUP_CONFIG = {
	leads: {
		label: "Lead Tenants",
		description: "Interest submitted, but no full application yet.",
		icon: SparklesIcon,
	},
	applicants: {
		label: "Applicants",
		description: "Applied, in review, or waiting on follow-up.",
		icon: UsersIcon,
	},
	activation: {
		label: "Approved + Activation",
		description: "Approved accounts moving through next steps before live operations.",
		icon: ChatBubbleLeftRightIcon,
	},
	live: {
		label: "Live Accounts",
		description: "Active, past due, or suspended operational tenants.",
		icon: BuildingOffice2Icon,
	},
	closed: {
		label: "Closed",
		description: "Closed or archived tenant accounts.",
		icon: SparklesIcon,
	},
	other: {
		label: "Other",
		description: "Accounts outside the standard workflow buckets.",
		icon: BuildingOffice2Icon,
	},
};

const TIMELINE_ACTIONS = {
	timeline_sign_documents: {
		subjectLine: "Sign your rental documents",
		message:
			"Review and sign the required rental documents so your trailer can be released.",
		stage: "current",
	},
	timeline_review_contract: {
		subjectLine: "Review your contract details",
		message: "Review your rental contract details once the document packet is ready.",
		stage: "upcoming",
	},
	timeline_pick_up_trailer: {
		subjectLine: "Coordinate trailer pickup",
		message:
			"Coordinate pickup details once your documents and contract steps are complete.",
		stage: "upcoming",
	},
};

const TAB_IDS = new Set(["communications", "status", "billing", "documents"]);

function formatDate(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleString();
}

function buildCommunicationDraft(detail, actionKey = "general_update") {
	const timelineConfig = TIMELINE_ACTIONS[actionKey] ?? null;
	return {
		actionKey,
		subjectLine: timelineConfig
			? timelineConfig.subjectLine
			: `Account update for ${detail.tenant.display_name}`,
		message: timelineConfig ? timelineConfig.message : "",
		stage: timelineConfig ? timelineConfig.stage : "current",
		sendEmail: true,
	};
}

export default function TenantManagementWorkspace() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const initialTenantId = searchParams.get("tenant") || "";
	const initialTab = TAB_IDS.has(searchParams.get("tab"))
		? searchParams.get("tab")
		: "communications";

	const [tenants, setTenants] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTenantId, setSelectedTenantId] = useState(initialTenantId);
	const [activeTab, setActiveTab] = useState(initialTab);
	const [detailsByTenantId, setDetailsByTenantId] = useState({});
	const [detailLoadingByTenantId, setDetailLoadingByTenantId] = useState({});
	const [detailErrorByTenantId, setDetailErrorByTenantId] = useState({});
	const [notesByTenantId, setNotesByTenantId] = useState({});
	const [actionLoadingByTenantId, setActionLoadingByTenantId] = useState({});
	const [actionErrorByTenantId, setActionErrorByTenantId] = useState({});
	const [communicationDraftsByTenantId, setCommunicationDraftsByTenantId] = useState({});
	const [communicationLoadingByTenantId, setCommunicationLoadingByTenantId] = useState({});
	const [communicationErrorByTenantId, setCommunicationErrorByTenantId] = useState({});
	const [communicationSuccessByTenantId, setCommunicationSuccessByTenantId] = useState({});

	function syncLocation(tenantId, tabId = "communications") {
		const params = new URLSearchParams(searchParams.toString());
		if (tenantId) {
			params.set("tenant", tenantId);
			if (tabId && tabId !== "communications") {
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

	function selectTenant(tenantId, nextTab = "communications") {
		setSelectedTenantId(tenantId);
		setActiveTab(nextTab);
		syncLocation(tenantId, nextTab);
	}

	function closeTenantModal() {
		setSelectedTenantId("");
		setActiveTab("communications");
		syncLocation("", "communications");
	}

	async function loadTenants() {
		try {
			const res = await fetch("/api/admin/tenants");
			const json = await res.json().catch(() => []);

			if (!res.ok) {
				setError(
					typeof json?.error === "string"
						? json.error
						: "Failed to load management tenants.",
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
			setNotesByTenantId((current) => ({
				...current,
				[tenantId]: json.currentApplication?.review_notes || "",
			}));
			setCommunicationDraftsByTenantId((current) => ({
				...current,
				[tenantId]: current[tenantId] || buildCommunicationDraft(json),
			}));
			setCommunicationErrorByTenantId((current) => ({ ...current, [tenantId]: "" }));
			setCommunicationSuccessByTenantId((current) => ({ ...current, [tenantId]: "" }));
			setDetailLoadingByTenantId((current) => ({ ...current, [tenantId]: false }));
		} catch {
			setDetailErrorByTenantId((current) => ({
				...current,
				[tenantId]: "Failed to load tenant details.",
			}));
			setDetailLoadingByTenantId((current) => ({ ...current, [tenantId]: false }));
		}
	}

	useEffect(() => {
		const frame = window.requestAnimationFrame(() => {
			void loadTenants();
		});

		return () => {
			window.cancelAnimationFrame(frame);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!selectedTenantId) return;
		const frame = window.requestAnimationFrame(() => {
			void loadTenantDetail(selectedTenantId);
		});
		return () => {
			window.cancelAnimationFrame(frame);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedTenantId]);

	const filteredTenants = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return tenants;

		return tenants.filter((tenant) => {
			return [
				tenant.displayName,
				tenant.primaryEmail,
				tenant.primaryPhone,
				tenant.status,
				tenant.latestApplication?.status,
			]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(query));
		});
	}, [searchQuery, tenants]);

	const groupedTenants = useMemo(() => {
		const groups = {
			leads: [],
			applicants: [],
			activation: [],
			live: [],
			closed: [],
			other: [],
		};

		for (const tenant of filteredTenants) {
			const groupKey = GROUP_CONFIG[tenant.group] ? tenant.group : "other";
			groups[groupKey].push(tenant);
		}

		return groups;
	}, [filteredTenants]);

	const selectedDetail = selectedTenantId ? detailsByTenantId[selectedTenantId] || null : null;
	const selectedNotes = notesByTenantId[selectedTenantId] || "";
	const selectedDraft = communicationDraftsByTenantId[selectedTenantId] ||
		(selectedDetail
			? buildCommunicationDraft(selectedDetail)
			: {
					actionKey: "general_update",
					subjectLine: "",
					message: "",
					stage: "current",
					sendEmail: true,
			  });

	async function refreshTenant(tenantId) {
		await Promise.all([loadTenants(), loadTenantDetail(tenantId, { force: true })]);
	}

	async function handleSubmitStatusAction(action) {
		const detail = selectedDetail;
		const applicationId = detail?.currentApplication?.id;
		if (!applicationId || !selectedTenantId) return;

		setActionLoadingByTenantId((current) => ({ ...current, [selectedTenantId]: action }));
		setActionErrorByTenantId((current) => ({ ...current, [selectedTenantId]: "" }));

		try {
			const res = await fetch(
				`/api/admin/applications/${encodeURIComponent(applicationId)}/decision`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						action,
						reviewNotes: selectedNotes,
					}),
				},
			);
			const json = await res.json().catch(() => ({}));

			if (!res.ok) {
				setActionErrorByTenantId((current) => ({
					...current,
					[selectedTenantId]:
						typeof json?.error === "string"
							? json.error
							: "Failed to update workflow status.",
				}));
				setActionLoadingByTenantId((current) => ({ ...current, [selectedTenantId]: "" }));
				return;
			}

			setActionLoadingByTenantId((current) => ({ ...current, [selectedTenantId]: "" }));
			await refreshTenant(selectedTenantId);
		} catch {
			setActionErrorByTenantId((current) => ({
				...current,
				[selectedTenantId]: "Failed to update workflow status.",
			}));
			setActionLoadingByTenantId((current) => ({ ...current, [selectedTenantId]: "" }));
		}
	}

	function updateCommunicationDraft(patch) {
		if (!selectedTenantId || !selectedDetail) return;

		setCommunicationDraftsByTenantId((current) => {
			const existing = current[selectedTenantId] || buildCommunicationDraft(selectedDetail);
			if (typeof patch.actionKey === "string" && patch.actionKey !== existing.actionKey) {
				return {
					...current,
					[selectedTenantId]: {
						...buildCommunicationDraft(selectedDetail, patch.actionKey),
						...("sendEmail" in patch ? { sendEmail: patch.sendEmail } : {}),
					},
				};
			}

			return {
				...current,
				[selectedTenantId]: {
					...existing,
					...patch,
				},
			};
		});
	}

	async function handleCommunicationSubmit() {
		if (!selectedTenantId || !selectedDetail) return;
		const draft = selectedDraft;
		const currentApplicationId = selectedDetail.currentApplication?.id || null;

		setCommunicationLoadingByTenantId((current) => ({ ...current, [selectedTenantId]: true }));
		setCommunicationErrorByTenantId((current) => ({ ...current, [selectedTenantId]: "" }));
		setCommunicationSuccessByTenantId((current) => ({ ...current, [selectedTenantId]: "" }));

		try {
			let res;
			if (draft.actionKey === "general_update") {
				res = await fetch(`/api/admin/tenants/${encodeURIComponent(selectedTenantId)}/communication`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						subjectLine: draft.subjectLine,
						message: draft.message,
						applicationId: currentApplicationId,
					}),
				});
			} else {
				if (!currentApplicationId) {
					setCommunicationErrorByTenantId((current) => ({
						...current,
						[selectedTenantId]: "A submitted application is required before timeline updates can be published.",
					}));
					setCommunicationLoadingByTenantId((current) => ({ ...current, [selectedTenantId]: false }));
					return;
				}

				const itemKey = draft.actionKey.replace("timeline_", "");
				const routeKey = {
					sign_documents: JOURNEY_ITEM_KEYS.signDocuments,
					review_contract: JOURNEY_ITEM_KEYS.reviewContract,
					pick_up_trailer: JOURNEY_ITEM_KEYS.pickUpTrailer,
				}[itemKey];

				res = await fetch(`/api/admin/applications/${encodeURIComponent(currentApplicationId)}/timeline`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						itemKey: routeKey,
						stage: draft.stage,
						description: draft.message,
						sendUpdateEmail: draft.sendEmail,
					}),
				});
			}

			const json = await res.json().catch(() => ({}));
			if (!res.ok) {
				setCommunicationErrorByTenantId((current) => ({
					...current,
					[selectedTenantId]:
						typeof json?.error === "string"
							? json.error
							: "Failed to send update.",
				}));
				setCommunicationLoadingByTenantId((current) => ({ ...current, [selectedTenantId]: false }));
				return;
			}

			setCommunicationSuccessByTenantId((current) => ({
				...current,
				[selectedTenantId]:
					draft.actionKey === "general_update"
						? "General account update sent."
						: "Timeline update published.",
			}));
			setCommunicationLoadingByTenantId((current) => ({ ...current, [selectedTenantId]: false }));
			await refreshTenant(selectedTenantId);
		} catch {
			setCommunicationErrorByTenantId((current) => ({
				...current,
				[selectedTenantId]: "Failed to send update.",
			}));
			setCommunicationLoadingByTenantId((current) => ({ ...current, [selectedTenantId]: false }));
		}
	}

	if (loading) {
		return (
			<div className="space-y-4">
				<LoadingPanel
					title="Loading Management"
					subtitle="Fetching tenant account groups and workflow context."
				/>
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
				message="Tenant accounts created through interest and application intake will appear here."
			/>
		);
	}

	return (
		<>
			<div className="space-y-6">
				<Card>
					<div className="space-y-4">
						<div>
							<p className="text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
								Management
							</p>
							<h2 className="mt-2 font-syne text-3xl font-bold text-neutral-950 dark:text-neutral-50">
								Tenant Accounts
							</h2>
							<p className="mt-2 max-w-4xl text-sm text-neutral-600 dark:text-neutral-400">
								Browse accounts by grouped workflow state. Selecting a tenant opens the standard management modal for communications, status, billing, and documents.
							</p>
						</div>
						<label className="relative block max-w-xl">
							<MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
							<input
								type="text"
								value={searchQuery}
								onChange={(event) => setSearchQuery(event.target.value)}
								className="w-full rounded-2xl border border-(--border-soft) bg-white py-3 pl-12 pr-4 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
								placeholder="Search by company, account owner email, phone, or status"
							/>
						</label>
					</div>
				</Card>

				<div className="grid grid-cols-1 gap-4">
					{Object.entries(GROUP_CONFIG).map(([groupKey, config]) => {
						const items = groupedTenants[groupKey] || [];
						const Icon = config.icon;
						return (
							<Card key={groupKey} className="h-full">
								<div className="space-y-4">
									<div className="flex items-start gap-3">
										<div className="rounded-2xl bg-red-50 p-3 text-(--branding-700) dark:bg-red-950/20">
											<Icon className="h-5 w-5" aria-hidden="true" />
										</div>
										<div>
											<div className="flex flex-wrap items-center gap-3">
												<h3 className="font-syne text-xl font-bold text-neutral-950 dark:text-neutral-50">
													{config.label}
												</h3>
												<StatusBadge status={`${items.length} total`} />
											</div>
											<p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
												{config.description}
											</p>
										</div>
									</div>

									{items.length ? (
										<div className="space-y-3">
											{items.map((tenant) => (
												<button
													key={tenant.id}
													type="button"
													onClick={() => selectTenant(tenant.id)}
													className="w-full rounded-2xl border border-(--border-soft) bg-white/80 p-4 text-left transition hover:border-(--branding-700) hover:bg-red-50/40 dark:bg-neutral-950/40 dark:hover:bg-red-950/10"
												>
													<div className="flex flex-wrap items-start justify-between gap-3">
														<div className="space-y-1.5">
															<p className="font-semibold text-neutral-950 dark:text-neutral-50">
																{tenant.displayName}
															</p>
															<p className="text-sm text-neutral-600 dark:text-neutral-400">
																Account Owner: {tenant.primaryEmail}
															</p>
															<p className="text-xs text-neutral-500 dark:text-neutral-400">
																{tenant.primaryPhone || "No phone on file"} | Updated {formatDate(tenant.updatedAt)}
															</p>
														</div>
														<div className="flex flex-col items-end gap-2">
															<StatusBadge status={tenant.status} />
															{tenant.latestApplication ? (
																<StatusBadge status={tenant.latestApplication.status} />
															) : null}
														</div>
													</div>
													<div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400">
														<div className="flex flex-wrap gap-3">
															<span>{tenant.communicationCount} communication(s)</span>
															<span>{tenant.pendingTimelineCount} pending action(s)</span>
															<span>{tenant.rentalCount} rental(s)</span>
														</div>
														<span className="inline-flex items-center gap-1 font-semibold text-(--branding-700)">
															Open management
															<ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
														</span>
													</div>
												</button>
											))}
										</div>
									) : (
										<p className="text-sm text-neutral-600 dark:text-neutral-400">
											No tenants in this group{searchQuery ? " for the current search." : "."}
										</p>
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
				notes={selectedNotes}
				onNotesChange={(value) =>
					setNotesByTenantId((current) => ({ ...current, [selectedTenantId]: value }))
				}
				onSubmitAction={handleSubmitStatusAction}
				actionLoading={actionLoadingByTenantId[selectedTenantId] || ""}
				actionError={actionErrorByTenantId[selectedTenantId] || ""}
				communicationDraft={selectedDraft}
				onCommunicationDraftChange={updateCommunicationDraft}
				onCommunicationSubmit={handleCommunicationSubmit}
				communicationSubmitting={Boolean(communicationLoadingByTenantId[selectedTenantId])}
				communicationError={communicationErrorByTenantId[selectedTenantId] || ""}
				communicationSuccess={communicationSuccessByTenantId[selectedTenantId] || ""}
			/>
		</>
	);
}
