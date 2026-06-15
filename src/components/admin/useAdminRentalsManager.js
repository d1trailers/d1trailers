"use client";

import { useCallback, useEffect, useState } from "react";
import { JOURNEY_ITEM_KEYS } from "@/lib/contracts/journey";

export default function useAdminRentalsManager() {
	const [rentals, setRentals] = useState([]);
	const [tenants, setTenants] = useState([]);
	const [availableTrailers, setAvailableTrailers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [modalOpen, setModalOpen] = useState(false);
	const [modalMode, setModalMode] = useState("edit");
	const [selectedRentalId, setSelectedRentalId] = useState("");
	const [detail, setDetail] = useState(null);
	const [detailLoading, setDetailLoading] = useState(false);
	const [detailError, setDetailError] = useState("");
	const [saving, setSaving] = useState(false);
	const [deleteLoading, setDeleteLoading] = useState(false);
	const [submitError, setSubmitError] = useState("");

	const loadData = useCallback(async () => {
		try {
			const [rentalsResponse, tenantsResponse, trailersResponse] = await Promise.all([
				fetch("/api/admin/rentals", { cache: "no-store" }),
				fetch("/api/admin/tenants", { cache: "no-store" }),
				fetch("/api/admin/trailers", { cache: "no-store" }),
			]);
			const rentalsJson = await rentalsResponse.json().catch(() => []);
			const tenantsJson = await tenantsResponse.json().catch(() => []);
			const trailersJson = await trailersResponse.json().catch(() => []);

			if (!rentalsResponse.ok) {
				setError(
					typeof rentalsJson?.error === "string"
						? rentalsJson.error
						: "Failed to load rentals.",
				);
				setLoading(false);
				return;
			}

			setRentals(Array.isArray(rentalsJson) ? rentalsJson : []);
			setTenants(Array.isArray(tenantsJson) ? tenantsJson : []);
			setAvailableTrailers(
				(Array.isArray(trailersJson) ? trailersJson : []).filter(
					(trailer) => trailer.status === "available",
				),
			);
			setError("");
			setLoading(false);
		} catch {
			setError("Failed to load rentals.");
			setLoading(false);
		}
	}, []);

	const loadDetail = useCallback(async (rentalId) => {
		if (!rentalId) return;
		setDetailLoading(true);
		setDetailError("");

		try {
			const response = await fetch(`/api/admin/rentals/${encodeURIComponent(rentalId)}`);
			const json = await response.json().catch(() => ({}));

			if (!response.ok) {
				setDetailError(
					typeof json?.error === "string"
						? json.error
						: "Failed to load rental detail.",
				);
				setDetailLoading(false);
				return;
			}

			setDetail(json);
			setDetailLoading(false);
		} catch {
			setDetailError("Failed to load rental detail.");
			setDetailLoading(false);
		}
	}, []);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			void loadData();
		}, 0);
		return () => window.clearTimeout(timer);
	}, [loadData]);

	useEffect(() => {
		if (modalOpen && modalMode === "edit" && selectedRentalId) {
			const timer = window.setTimeout(() => {
				void loadDetail(selectedRentalId);
			}, 0);
			return () => window.clearTimeout(timer);
		}
	}, [loadDetail, modalMode, modalOpen, selectedRentalId]);

	function openCreateModal() {
		setModalMode("create");
		setSelectedRentalId("");
		setDetail(null);
		setDetailError("");
		setSubmitError("");
		setModalOpen(true);
	}

	function openEditModal(rentalId) {
		setModalMode("edit");
		setSelectedRentalId(rentalId);
		setDetail(null);
		setDetailError("");
		setSubmitError("");
		setModalOpen(true);
	}

	function closeModal() {
		setModalOpen(false);
		setSelectedRentalId("");
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
					? await fetch("/api/admin/rentals", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify(payload),
						})
					: await fetch(`/api/admin/rentals/${encodeURIComponent(selectedRentalId)}`, {
							method: "PATCH",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify(payload),
						});

			const json = await response.json().catch(() => ({}));
			if (!response.ok) {
				setSubmitError(
					typeof json?.error === "string"
						? json.error
						: "Failed to save rental.",
				);
				setSaving(false);
				return;
			}

			setSaving(false);
			await loadData();
			if (modalMode === "edit" && selectedRentalId) {
				await loadDetail(selectedRentalId);
			} else {
				closeModal();
			}
		} catch {
			setSubmitError("Failed to save rental.");
			setSaving(false);
		}
	}

	async function handleDelete() {
		if (!selectedRentalId) return;
		setDeleteLoading(true);
		setSubmitError("");

		try {
			const response = await fetch(`/api/admin/rentals/${encodeURIComponent(selectedRentalId)}`, {
				method: "DELETE",
			});
			const json = await response.json().catch(() => ({}));
			if (!response.ok) {
				setSubmitError(
					typeof json?.error === "string"
						? json.error
						: "Failed to delete rental.",
				);
				setDeleteLoading(false);
				return;
			}

			setDeleteLoading(false);
			await loadData();
			closeModal();
		} catch {
			setSubmitError("Failed to delete rental.");
			setDeleteLoading(false);
		}
	}

	async function handleRemoveAssignment(assignmentId) {
		if (!selectedRentalId) {
			return { error: "Select a rental first." };
		}

		try {
			const response = await fetch(
				`/api/admin/rentals/${encodeURIComponent(selectedRentalId)}/assignments/${encodeURIComponent(assignmentId)}`,
				{
					method: "DELETE",
				}
			);
			const json = await response.json().catch(() => ({}));
			if (!response.ok) {
				return {
					error:
						typeof json?.error === "string"
							? json.error
							: "Failed to remove the assignment.",
				};
			}

			await loadData();
			await loadDetail(selectedRentalId);
			return { ok: true };
		} catch {
			return { error: "Failed to remove the assignment." };
		}
	}

	async function handleUploadDocument(formData) {
		if (!selectedRentalId) {
			return { error: "Select a rental first." };
		}

		try {
			const response = await fetch(
				`/api/admin/rentals/${encodeURIComponent(selectedRentalId)}/documents`,
				{
					method: "POST",
					body: formData,
				}
			);
			const json = await response.json().catch(() => ({}));
			if (!response.ok) {
				return {
					error:
						typeof json?.error === "string"
							? json.error
							: "Failed to upload document.",
				};
			}

			await loadData();
			await loadDetail(selectedRentalId);
			return { ok: true };
		} catch {
			return { error: "Failed to upload document." };
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
				const response = await fetch(
					`/api/admin/tenants/${encodeURIComponent(tenantId)}/communication`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							subjectLine,
							message,
							applicationId,
							rentalId,
						}),
					}
				);
				const json = await response.json().catch(() => ({}));
				if (!response.ok) {
					return {
						error:
							typeof json?.error === "string"
								? json.error
								: "Failed to send update.",
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

				const response = await fetch(
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
				const json = await response.json().catch(() => ({}));
				if (!response.ok) {
					return {
						error:
							typeof json?.error === "string"
								? json.error
								: "Failed to publish update.",
					};
				}
			}

			await loadData();
			if (selectedRentalId) {
				await loadDetail(selectedRentalId);
			}
			return { ok: true };
		} catch {
			return { error: "Failed to send update." };
		}
	}

	return {
		rentals,
		tenants,
		availableTrailers,
		loading,
		error,
		modalOpen,
		modalMode,
		selectedRentalId,
		detail,
		detailLoading,
		detailError,
		saving,
		deleteLoading,
		submitError,
		loadData,
		openCreateModal,
		openEditModal,
		closeModal,
		handleSubmit,
		handleDelete,
		handleRemoveAssignment,
		handleUploadDocument,
		handleSendCommunication,
	};
}
