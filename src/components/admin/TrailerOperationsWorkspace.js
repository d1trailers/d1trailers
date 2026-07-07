"use client";

import { useEffect, useMemo, useState } from "react";
import {
	MagnifyingGlassIcon,
	PlusIcon,
	RectangleStackIcon,
} from "@heroicons/react/24/outline";
import Card from "@/components/ui/Card";
import ActionButton from "@/components/ui/ActionButton";
import StatusBadge from "@/components/admin/StatusBadge";
import TrailerManagementModal from "@/components/admin/TrailerManagementModal";
import { formatTrailerType } from "@/lib/trailerTypes";

const GROUP_LABELS = {
	available: "Available",
	reserved: "Reserved",
	rented: "Rented",
	maintenance: "Maintenance",
	retired: "Retired",
};

export default function TrailerOperationsWorkspace() {
	const [trailers, setTrailers] = useState([]);
	const [assignableRentals, setAssignableRentals] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [search, setSearch] = useState("");
	const [modalOpen, setModalOpen] = useState(false);
	const [modalMode, setModalMode] = useState("edit");
	const [selectedTrailerId, setSelectedTrailerId] = useState("");
	const [detail, setDetail] = useState(null);
	const [detailLoading, setDetailLoading] = useState(false);
	const [detailError, setDetailError] = useState("");
	const [saving, setSaving] = useState(false);
	const [submitError, setSubmitError] = useState("");

	async function loadTrailers() {
		try {
			const [trailersResponse, rentalsResponse] = await Promise.all([
				fetch("/api/admin/trailers", { cache: "no-store" }),
				fetch("/api/admin/rentals", { cache: "no-store" }),
			]);
			const trailersJson = await trailersResponse.json().catch(() => []);
			const rentalsJson = await rentalsResponse.json().catch(() => []);
			if (!trailersResponse.ok) {
				setError(
					typeof trailersJson?.error === "string"
						? trailersJson.error
						: "Failed to load trailers.",
				);
				setLoading(false);
				return;
			}

			setTrailers(Array.isArray(trailersJson) ? trailersJson : []);
			setAssignableRentals(
				(Array.isArray(rentalsJson) ? rentalsJson : []).filter(
					(rental) =>
						rental.recordKind === "agreement" &&
						!["returned", "cancelled"].includes(rental.status),
				),
			);
			setError("");
			setLoading(false);
		} catch {
			setError("Failed to load trailers.");
			setLoading(false);
		}
	}

	async function loadDetail(trailerId) {
		setDetailLoading(true);
		setDetailError("");
		try {
			const response = await fetch(
				`/api/admin/trailers/${encodeURIComponent(trailerId)}`,
			);
			const json = await response.json().catch(() => ({}));
			if (!response.ok) {
				setDetailError(
					typeof json?.error === "string"
						? json.error
						: "Failed to load trailer detail.",
				);
				setDetailLoading(false);
				return;
			}

			setDetail(json);
			setDetailLoading(false);
		} catch {
			setDetailError("Failed to load trailer detail.");
			setDetailLoading(false);
		}
	}

	useEffect(() => {
		const timer = window.setTimeout(() => {
			void loadTrailers();
		}, 0);
		return () => window.clearTimeout(timer);
	}, []);

	useEffect(() => {
		if (modalOpen && modalMode === "edit" && selectedTrailerId) {
			const timer = window.setTimeout(() => {
				void loadDetail(selectedTrailerId);
			}, 0);
			return () => window.clearTimeout(timer);
		}
	}, [modalMode, modalOpen, selectedTrailerId]);

	const filteredTrailers = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return trailers;

		return trailers.filter((trailer) =>
			[
				trailer.trailerCode,
				trailer.trailerType,
				trailer.plateNumber,
				trailer.vin,
				trailer.status,
			]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(query)),
		);
	}, [search, trailers]);

	const groupedTrailers = useMemo(() => {
		const groups = {
			available: [],
			reserved: [],
			rented: [],
			maintenance: [],
			retired: [],
		};
		for (const trailer of filteredTrailers) {
			const status = groups[trailer.status] ? trailer.status : "available";
			groups[status].push(trailer);
		}
		return groups;
	}, [filteredTrailers]);

	function openCreateModal() {
		setModalMode("create");
		setSelectedTrailerId("");
		setDetail(null);
		setDetailError("");
		setSubmitError("");
		setModalOpen(true);
	}

	function openEditModal(trailerId) {
		setModalMode("edit");
		setSelectedTrailerId(trailerId);
		setDetail(null);
		setDetailError("");
		setSubmitError("");
		setModalOpen(true);
	}

	function closeModal() {
		setModalOpen(false);
		setSelectedTrailerId("");
		setDetail(null);
		setDetailError("");
		setSubmitError("");
	}

	async function handleSubmit(payload) {
		setSaving(true);
		setSubmitError("");

		try {
			const response =
				modalMode === "create"
					? await fetch("/api/admin/trailers", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify(payload),
						})
					: await fetch(
							`/api/admin/trailers/${encodeURIComponent(selectedTrailerId)}`,
							{
								method: "PATCH",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify(payload),
							},
						);
			const json = await response.json().catch(() => ({}));
			if (!response.ok) {
				setSubmitError(
					typeof json?.error === "string"
						? json.error
						: "Failed to save trailer.",
				);
				setSaving(false);
				return;
			}

			setSaving(false);
			await loadTrailers();
			if (modalMode === "edit" && selectedTrailerId) {
				await loadDetail(selectedTrailerId);
			} else {
				closeModal();
			}
		} catch {
			setSubmitError("Failed to save trailer.");
			setSaving(false);
		}
	}

	return (
		<>
			<div className="space-y-4">
				<Card className="gap-4">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div className="space-y-2">
							<p className="text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
								Trailer Inventory
							</p>
							<h2 className="font-syne text-3xl font-bold text-neutral-950 dark:text-neutral-50">
								Trailers
							</h2>
						</div>
						<ActionButton
							type="button"
							tone="primary"
							onClick={openCreateModal}
						>
							<PlusIcon className="h-5 w-5" aria-hidden="true" />
							Add Trailer
						</ActionButton>
					</div>

					<div className="relative">
						<MagnifyingGlassIcon
							className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400"
							aria-hidden="true"
						/>
						<input
							type="search"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search by trailer code, type, plate, VIN, or status"
							className="w-full rounded-2xl border border-(--border-soft) bg-white px-12 py-3 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
						/>
					</div>
				</Card>

				{loading ? (
					<Card>
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							Loading trailer inventory...
						</p>
					</Card>
				) : error ? (
					<Card>
						<p className="text-sm font-medium text-red-600">{error}</p>
					</Card>
				) : (
					<div className="grid w-full gap-4">
						{Object.entries(GROUP_LABELS).map(([status, label]) => (
							<Card key={status} className="h-full">
								<div className="space-y-4">
									<div>
										<p className="text-xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
											{label}
										</p>
									</div>
									<div className="space-y-3">
										{groupedTrailers[status].length ? (
											groupedTrailers[status].map((trailer) => (
												<button
													key={trailer.id}
													type="button"
													onClick={() => openEditModal(trailer.id)}
													className="w-full rounded-2xl border border-(--border-soft) bg-white/80 p-4 text-left transition hover:border-(--branding-700) hover:bg-white dark:bg-neutral-950/60"
												>
													<div className="flex flex-wrap items-start justify-between gap-3">
														<div>
															<p className="font-semibold text-neutral-950 dark:text-neutral-50">
																{trailer.trailerCode ||
																	trailer.vin ||
																	trailer.id}
															</p>
															<p className="text-sm text-neutral-600 dark:text-neutral-400">
																{formatTrailerType(trailer.trailerType)}
															</p>
															<p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
																{trailer.activeAssignmentCount} active
																assignment(s)
															</p>
														</div>
														<div className="flex flex-col items-end gap-2">
															<StatusBadge status={trailer.status} />
														</div>
													</div>
												</button>
											))
										) : (
											<div className="rounded-2xl border border-dashed border-(--border-soft) p-4 text-sm text-neutral-600 dark:text-neutral-400">
												No trailers in this group.
											</div>
										)}
									</div>
								</div>
							</Card>
						))}
					</div>
				)}
			</div>

			<TrailerManagementModal
				open={modalOpen}
				onClose={closeModal}
				mode={modalMode}
				detail={detail}
				loading={detailLoading}
				error={detailError}
				onSubmit={handleSubmit}
				submitting={saving}
				submitError={submitError}
				assignableRentals={assignableRentals}
			/>
		</>
	);
}
