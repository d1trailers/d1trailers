"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import ScreenModal from "@/components/ui/ScreenModal";
import StatusBadge from "@/components/admin/StatusBadge";
import RentalEditableFields from "@/components/rentals/RentalEditableFields";
import ActionButton from "@/components/ui/ActionButton";
import {
	formatRentalCurrency,
	formatRentalDate,
	formatRentalLabel,
	getRentalRecordTitle,
	RentalDocumentsCard,
	RentalHeaderCard,
	RentalMetricTile,
} from "@/components/rentals/RentalDetailShared";
import RentalTrailerChecklist from "@/components/rentals/RentalTrailerChecklist";
import RentalDocumentUploadCard from "@/components/rentals/RentalDocumentUploadCard";
import ConfirmActionModal from "@/components/ui/ConfirmActionModal";
import {
	RentalBillingCard,
	RentalCommunicationsCard,
	RentalSnapshotCard,
	RentalTimelineGrid,
} from "@/components/rentals/RentalActivitySections";
import { getTrailerTypeFormValue } from "@/lib/trailerTypes";
import { serializeRequestedTrailerTypes } from "@/components/rentals/RequestedTrailerTypesField";

function emptyRequestForm() {
	return {
		billingFrequency: "monthly",
		contractStartDate: "",
		operationalStartDate: "",
		endDate: "",
		requestedTrailerTypes: [{ trailerType: "flatbed", quantity: "1" }],
		requestSummary: "",
	};
}

function getRequestedTrailerTypesForForm(rental) {
	const rows = Array.isArray(rental?.requestedTrailerTypes)
		? rental.requestedTrailerTypes
		: [];
	const normalized = rows
		.map((row) => ({
			trailerType: getTrailerTypeFormValue(row?.trailerType) || "flatbed",
			quantity:
				row?.quantity === null || row?.quantity === undefined
					? "1"
					: String(row.quantity),
		}))
		.filter((row) => row.trailerType);

	if (normalized.length) return normalized;

	return [
		{
			trailerType: getTrailerTypeFormValue(rental?.requestedTrailerType) || "flatbed",
			quantity:
				rental?.requestedTrailerCount === null ||
				rental?.requestedTrailerCount === undefined
					? "1"
					: String(rental.requestedTrailerCount),
		},
	];
}

function isClosedRequestStatus(status) {
	return ["declined", "cancelled", "returned"].includes(status);
}

export default function TenantRentalModal({
	open,
	onClose,
	rentalView,
	canViewBilling,
	canViewDocuments,
	canViewTimeline,
	canManageRentals,
}) {
	const rental = rentalView?.rental ?? null;
	const trailers = rentalView?.trailers ?? [];
	const documents = rentalView?.documents ?? [];
	const communications = rentalView?.communications ?? [];
	const timeline = rentalView?.timeline ?? {
		actionRequired: [],
		inProgress: [],
		upcoming: [],
		completed: [],
	};
	const modalTitle = getRentalRecordTitle(rental);
	const [changeRequest, setChangeRequest] = useState(emptyRequestForm);
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState("");
	const [submitSuccess, setSubmitSuccess] = useState("");
	const [removingAssignmentId, setRemovingAssignmentId] = useState("");
	const [pendingAssignmentRemoval, setPendingAssignmentRemoval] = useState(null);
	const [pendingRentalCancellation, setPendingRentalCancellation] = useState(false);

	const canModifyRental =
		Boolean(rental) &&
		canManageRentals &&
		!isClosedRequestStatus(rental.status);
	const canApproveDraft = canModifyRental && rental.status === "customer_review";
	const canCancelRental = canModifyRental;
	const canAccessDocuments = canViewDocuments || canManageRentals;
	const approvedTermsLocked =
		rental?.recordKind === "agreement" ||
		["awaiting_first_payment", "active", "past_due", "suspended"].includes(
			rental?.status
		);
	const changeHeading =
		rental?.status === "customer_review"
			? "Review Proposal"
			: rental?.status === "changes_pending"
				? "Changes Pending"
				: rental?.recordKind === "request"
					? "Rental Draft"
					: "Rental Details";

	useEffect(() => {
		if (!rental) {
			return;
		}

		const frame = window.requestAnimationFrame(() => {
			setChangeRequest({
				billingFrequency: rental.billingFrequency || "monthly",
				contractStartDate: rental.contractStartDate || "",
				operationalStartDate: rental.operationalStartDate || "",
				endDate: rental.endDate || "",
				requestedTrailerTypes: getRequestedTrailerTypesForForm(rental),
				requestSummary: rental.requestSummary || "",
			});
			setSubmitError("");
			setSubmitSuccess("");
		});

		return () => window.cancelAnimationFrame(frame);
	}, [rental]);

	if (!rentalView || !rental) {
		return null;
	}

	function updateChangeField(field, value) {
		setChangeRequest((current) => ({
			...current,
			[field]: value,
		}));
	}

	async function handleRentalAction(action) {
		setSubmitting(true);
		setPendingRentalCancellation(false);
		setSubmitError("");
		setSubmitSuccess("");

		try {
			const response = await fetch(`/api/account/rentals/${rental.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action,
					billingFrequency: changeRequest.billingFrequency,
					contractStartDate: changeRequest.contractStartDate,
					operationalStartDate: changeRequest.operationalStartDate,
					endDate: changeRequest.endDate,
					requestedTrailerTypes: serializeRequestedTrailerTypes(
						changeRequest.requestedTrailerTypes
					),
					requestSummary: changeRequest.requestSummary,
				}),
			});
			const json = await response.json().catch(() => ({}));
			if (!response.ok) {
				setSubmitError(
					typeof json?.error === "string"
						? json.error
						: "Unable to update this rental."
				);
				setSubmitting(false);
				return;
			}

			if (action === "approve_draft" && json?.billing?.url) {
				setSubmitSuccess("Proposal approved. Opening payment...");
				window.location.href = json.billing.url;
				return;
			}

			setSubmitSuccess(
				action === "approve_draft"
					? "Proposal approved. Reloading..."
					: action === "cancel_rental"
						? "Rental cancelled. Reloading..."
						: "Rental changes saved. Reloading..."
			);
			setSubmitting(false);
			window.setTimeout(() => window.location.reload(), 450);
		} catch {
			setSubmitError("Unable to update this rental.");
			setSubmitting(false);
		}
	}

	async function handleRemoveAssignment(assignmentId) {
		setRemovingAssignmentId(assignmentId);
		setPendingAssignmentRemoval(null);
		setSubmitError("");
		setSubmitSuccess("");

		try {
			const response = await fetch(
				`/api/account/rentals/${rental.id}/assignments/${assignmentId}`,
				{
					method: "DELETE",
				}
			);
			const json = await response.json().catch(() => ({}));
			if (!response.ok) {
				setSubmitError(
					typeof json?.error === "string"
						? json.error
						: "Unable to remove this trailer assignment."
				);
				setRemovingAssignmentId("");
				return;
			}

			setSubmitSuccess("Trailer assignment removed. Reloading...");
			setRemovingAssignmentId("");
			window.setTimeout(() => window.location.reload(), 450);
		} catch {
			setSubmitError("Unable to remove this trailer assignment.");
			setRemovingAssignmentId("");
		}
	}

	function requestAssignmentRemoval(trailerId) {
		const assignment = (rental.assignments || []).find(
			(candidate) => candidate.trailerId === trailerId
		);
		if (!assignment) return;
		setPendingAssignmentRemoval(assignment);
	}

	async function handleUploadDocument(formData) {
		setSubmitError("");
		setSubmitSuccess("");

		try {
			const response = await fetch(`/api/account/rentals/${rental.id}/documents`, {
				method: "POST",
				body: formData,
			});
			const json = await response.json().catch(() => ({}));
			if (!response.ok) {
				return {
					error:
						typeof json?.error === "string"
							? json.error
							: "Unable to upload this rental document.",
				};
			}

			setSubmitSuccess("Document uploaded. Reloading...");
			window.setTimeout(() => window.location.reload(), 450);
			return { ok: true };
		} catch {
			return { error: "Unable to upload this rental document." };
		}
	}

	return (
		<ScreenModal
			open={open}
			onClose={onClose}
			closeLabel="Close rental details"
			maxWidthClass="max-w-6xl"
		>
			<div className="space-y-5">
				<div className="space-y-2">
					<p className="text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
						Rental Details
					</p>
					<h2 className="font-syne text-3xl font-bold text-neutral-950 dark:text-neutral-50">
						{modalTitle}
					</h2>
				</div>

				<RentalHeaderCard
					rental={rental}
					pendingBadge={
						["customer_review", "changes_pending"].includes(rental.status) ? (
							<StatusBadge status={rental.status === "customer_review" ? "Customer Review" : "Changes Pending"} />
						) : null
					}
				/>

				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<RentalMetricTile
						label="Billing Frequency"
						value={formatRentalLabel(rental.billingFrequency)}
						hint="Commercial cadence for this rental."
					/>
					<RentalMetricTile
						label="Rate"
						value={formatRentalCurrency(rental.rate)}
						hint="Current recurring charge."
					/>
					<RentalMetricTile
						label="Deposit"
						value={formatRentalCurrency(rental.depositAmount)}
						hint="Deposit currently recorded."
					/>
					<RentalMetricTile
						label="Assigned Trailers"
						value={trailers.length}
						hint="Physical trailers linked through assignments."
					/>
				</div>

				<div className="grid gap-4 md:grid-cols-3">
					<RentalMetricTile
						label="Contract Start"
						value={formatRentalDate(rental.contractStartDate, { dateStyle: "medium" })}
					/>
					<RentalMetricTile
						label="Operational Start"
						value={formatRentalDate(rental.operationalStartDate, { dateStyle: "medium" })}
					/>
					<RentalMetricTile
						label="End Date"
						value={formatRentalDate(rental.endDate, { dateStyle: "medium" })}
					/>
				</div>

				{canModifyRental ? (
					<Card>
						<div className="space-y-4">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
									{changeHeading}
								</h3>
								<StatusBadge status={rental.status} />
							</div>
							<RentalEditableFields
								form={changeRequest}
								onFieldChange={updateChangeField}
								includeOperationalStart
								disabledFields={
									approvedTermsLocked
										? {
												billingFrequency: true,
												contractStartDate: true,
											}
										: {}
								}
								noteLabel="Notes"
								noteRows={4}
							/>
							<p className="text-sm text-neutral-600 dark:text-neutral-400">
								Submitting changes sends this rental back to admin review as
								`Changes Pending` while keeping the current billing status in place
								until the revision is finalized.
								{approvedTermsLocked
									? " Contract start and billing frequency are locked after approval."
									: ""}
							</p>
							<div className="flex flex-wrap justify-end gap-3">
								<ActionButton
									type="button"
									tone="primary"
									onClick={() => handleRentalAction("save_changes")}
									disabled={submitting}
								>
									{submitting ? (
										<span className="inline-flex h-5 w-5 rounded-full border-2 border-white/50 border-t-white animate-spin" />
									) : null}
									{rental.status === "changes_pending"
										? "Update Change Request"
										: "Request Changes"}
								</ActionButton>
								{canApproveDraft ? (
									<ActionButton
										type="button"
										tone="positive"
										onClick={() => handleRentalAction("approve_draft")}
										disabled={submitting}
									>
										Approve Proposal
									</ActionButton>
								) : null}
								{canCancelRental ? (
									<ActionButton
										type="button"
										tone="danger"
										onClick={() => setPendingRentalCancellation(true)}
										disabled={submitting}
									>
										Cancel Rental
									</ActionButton>
								) : null}
							</div>
							{submitSuccess ? (
								<p className="text-sm font-medium text-emerald-600">{submitSuccess}</p>
							) : null}
							{submitError ? (
								<p className="text-sm font-medium text-red-600">{submitError}</p>
							) : null}
						</div>
					</Card>
				) : null}

				<div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
					<RentalTrailerChecklist
						title="Assigned Trailers"
						description="Trailers currently connected to this rental."
						trailers={trailers.map((trailer) => ({
							...trailer,
							assignmentStatus: "Assigned",
						}))}
						selectedTrailerIds={trailers.map((trailer) => trailer.id)}
						onToggleTrailer={canManageRentals ? requestAssignmentRemoval : null}
						readOnly={!canManageRentals}
						emptyMessage="No trailer assignments are attached to this rental."
					/>
					<RentalSnapshotCard rental={rental} />
				</div>

				{canViewTimeline ? <RentalTimelineGrid timeline={timeline} /> : null}

				{canAccessDocuments ? (
					<div className="space-y-4">
						{canManageRentals ? (
							<RentalDocumentUploadCard
								title="Add Rental Document"
								description="Upload updated paperwork, supporting documents, or signed files for this rental."
								onUpload={handleUploadDocument}
								resetKey={`${rental.id}-${rental.updatedAt ?? ""}`}
							/>
						) : null}
						<RentalDocumentsCard
							title="Documents"
							documents={documents}
							emptyTitle="No Documents"
							emptyMessage="No documents are attached to this rental."
						/>
					</div>
				) : null}

				{canViewTimeline ? (
					<RentalCommunicationsCard communications={communications} />
				) : null}

				{canViewBilling ? (
					<RentalBillingCard rental={rental} enableActions />
				) : null}
			</div>

			<ConfirmActionModal
				open={Boolean(pendingAssignmentRemoval)}
				onClose={() => setPendingAssignmentRemoval(null)}
				onConfirm={() =>
					pendingAssignmentRemoval
						? handleRemoveAssignment(pendingAssignmentRemoval.id)
						: undefined
				}
				title="Unassign this trailer?"
				message="This will remove the trailer assignment from the rental and return the trailer to available inventory. This action is not immediately reversible from the tenant portal."
				confirmLabel="Unassign Trailer"
				loading={Boolean(
					pendingAssignmentRemoval &&
						removingAssignmentId === pendingAssignmentRemoval.id
				)}
			/>
			<ConfirmActionModal
				open={pendingRentalCancellation}
				onClose={() => setPendingRentalCancellation(false)}
				onConfirm={() => handleRentalAction("cancel_rental")}
				title="Cancel this rental?"
				message="This will cancel the rental workflow and release active trailer assignments. Use this only when you are sure the rental should be closed."
				confirmLabel="Cancel Rental"
				loading={submitting}
			/>
		</ScreenModal>
	);
}
