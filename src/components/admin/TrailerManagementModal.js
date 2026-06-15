"use client";

import { useEffect, useState } from "react";
import { ArrowPathIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import Card from "@/components/ui/Card";
import ScreenModal from "@/components/ui/ScreenModal";
import ActionButton from "@/components/ui/ActionButton";
import StatusBadge from "@/components/admin/StatusBadge";

function emptyForm() {
	return {
		trailerCode: "",
		trailerType: "",
		plateNumber: "",
		vin: "",
		status: "available",
		rentalId: "",
	};
}

function formatDate(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleDateString();
}

export default function TrailerManagementModal({
	open,
	onClose,
	mode = "edit",
	detail,
	loading,
	error,
	onSubmit,
	submitting,
	submitError,
	assignableRentals = [],
	maxWidthClass = "max-w-4xl",
}) {
	const trailer = detail?.trailer ?? null;
	const [form, setForm] = useState(emptyForm());
	const [rentalSearch, setRentalSearch] = useState("");

	useEffect(() => {
		if (!open) return;
		if (mode === "create" || !trailer) {
			const frame = window.requestAnimationFrame(() => {
				setForm(emptyForm());
			});
			return () => window.cancelAnimationFrame(frame);
		}

		const frame = window.requestAnimationFrame(() => {
			setForm({
				trailerCode: trailer.trailerCode || "",
				trailerType: trailer.trailerType || "",
				plateNumber: trailer.plateNumber || "",
				vin: trailer.vin || "",
				status: trailer.status || "available",
				rentalId: "",
			});
		});
		return () => window.cancelAnimationFrame(frame);
	}, [mode, open, trailer]);

	const filteredRentals = assignableRentals.filter((rental) => {
		const query = rentalSearch.trim().toLowerCase();
		if (!query) return true;

		return [
			rental.tenantName,
			rental.requestedTrailerType,
			rental.contractStartDate,
			rental.status,
		]
			.filter(Boolean)
			.some((value) => String(value).toLowerCase().includes(query));
	});

	return (
		<ScreenModal
			open={open}
			onClose={onClose}
			closeLabel="Close trailer management"
			maxWidthClass={maxWidthClass}
		>
			<div className="space-y-5">
				<div className="space-y-2">
					<p className="text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
						Trailer Management
					</p>
					<h2 className="font-syne text-3xl font-bold text-neutral-950 dark:text-neutral-50">
						{mode === "create" ? "Add Trailer" : "Trailer Details"}
					</h2>
				</div>

				{loading ? (
					<Card>
						<div className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
							<ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden="true" />
							Loading trailer details...
						</div>
					</Card>
				) : error ? (
					<Card>
						<p className="text-sm font-medium text-red-600">{error}</p>
					</Card>
				) : (
					<>
						{trailer ? (
							<Card>
								<div className="flex flex-wrap items-start justify-between gap-4">
									<div>
										<p className="font-semibold text-neutral-950 dark:text-neutral-50">
											{trailer.trailerCode || trailer.vin || trailer.id}
										</p>
										<p className="text-sm text-neutral-600 dark:text-neutral-400">
											Last updated {formatDate(trailer.updatedAt)}
										</p>
									</div>
									<StatusBadge status={trailer.status} />
								</div>
							</Card>
						) : null}

						<div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
							<Card>
								<div className="grid gap-4">
									<div className="grid gap-4 md:grid-cols-2">
										<label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
											Trailer Code
											<input
												type="text"
												value={form.trailerCode}
												onChange={(event) =>
													setForm((current) => ({
														...current,
														trailerCode: event.target.value,
													}))
												}
												className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
											/>
										</label>
										<label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
											Trailer Type
											<input
												type="text"
												value={form.trailerType}
												onChange={(event) =>
													setForm((current) => ({
														...current,
														trailerType: event.target.value,
													}))
												}
												className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
											/>
										</label>
									</div>

									<div className="grid gap-4 md:grid-cols-2">
										<label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
											Plate Number
											<input
												type="text"
												value={form.plateNumber}
												onChange={(event) =>
													setForm((current) => ({
														...current,
														plateNumber: event.target.value,
													}))
												}
												className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
											/>
										</label>
										<label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
											VIN
											<input
												type="text"
												value={form.vin}
												onChange={(event) =>
													setForm((current) => ({
														...current,
														vin: event.target.value,
													}))
												}
												className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
											/>
										</label>
									</div>

									<label className="grid gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
										Status
										<select
											value={form.status}
											onChange={(event) =>
												setForm((current) => ({
													...current,
													status: event.target.value,
												}))
											}
											className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
										>
											<option value="available">Available</option>
											<option value="reserved">Reserved</option>
											<option value="rented">Rented</option>
											<option value="maintenance">Maintenance</option>
											<option value="retired">Retired</option>
										</select>
									</label>
								</div>
							</Card>

							<Card>
								<div className="space-y-3">
									<h3 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
										{mode === "create" ? "Assign to a Rental" : "Active Assignments"}
									</h3>
									{mode === "create" ? (
										<>
											<p className="text-sm text-neutral-600 dark:text-neutral-400">
												Link this trailer to an existing rental agreement now, or leave it unassigned and keep it available.
											</p>
											<label className="block">
												<span className="sr-only">Search rentals</span>
												<input
													type="search"
													value={rentalSearch}
													onChange={(event) => setRentalSearch(event.target.value)}
													placeholder="Search by tenant, trailer type, or status"
													className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950/50 dark:text-neutral-100"
												/>
											</label>
											<label className="flex items-center gap-3 rounded-2xl border border-(--border-soft) bg-white/80 px-4 py-3 text-sm text-neutral-800 dark:bg-neutral-950/60 dark:text-neutral-100">
												<input
													type="radio"
													name="rental-assignment"
													checked={!form.rentalId}
													onChange={() =>
														setForm((current) => ({
															...current,
															rentalId: "",
														}))
													}
													className="h-4 w-4"
												/>
												<div>
													<p className="font-semibold">Keep unassigned</p>
													<p className="text-neutral-600 dark:text-neutral-400">
														The trailer will remain available until it is attached later.
													</p>
												</div>
											</label>
											{filteredRentals.length ? (
												<div className="space-y-3">
													{filteredRentals.map((rentalOption) => (
														<label
															key={rentalOption.id}
															className="flex items-center gap-3 rounded-2xl border border-(--border-soft) bg-white/80 px-4 py-3 text-sm text-neutral-800 dark:bg-neutral-950/60 dark:text-neutral-100"
														>
															<input
																type="radio"
																name="rental-assignment"
																checked={form.rentalId === rentalOption.id}
																onChange={() =>
																	setForm((current) => ({
																		...current,
																		rentalId: rentalOption.id,
																	}))
																}
																className="h-4 w-4"
															/>
															<div className="space-y-1">
																<p className="font-semibold">
																	{rentalOption.tenantName || "Unknown tenant"}
																</p>
																<p className="text-neutral-600 dark:text-neutral-400">
																	{rentalOption.requestedTrailerType || "Rental agreement"} | {rentalOption.status}
																</p>
																<p className="text-xs text-neutral-500 dark:text-neutral-400">
																	{rentalOption.contractStartDate
																		? `${formatDate(rentalOption.contractStartDate)} to ${formatDate(rentalOption.endDate)}`
																		: "Dates pending"}
																</p>
															</div>
														</label>
													))}
												</div>
											) : (
												<p className="text-sm text-neutral-600 dark:text-neutral-400">
													No assignable rentals match this search.
												</p>
											)}
										</>
									) : trailer?.assignments?.length ? (
										<div className="space-y-3">
											{trailer.assignments.map((assignment) => (
												<div key={assignment.id} className="surface-subtle rounded-2xl p-4">
													<div className="flex flex-wrap items-start justify-between gap-3">
														<div>
															<p className="font-semibold text-neutral-950 dark:text-neutral-50">
																{assignment.tenantName || "Tenant pending"}
															</p>
															<p className="text-sm text-neutral-600 dark:text-neutral-400">
																Rental {assignment.rentalId.slice(0, 8)}
															</p>
														</div>
														<StatusBadge status={assignment.status} />
													</div>
												</div>
											))}
										</div>
									) : (
										<p className="text-sm text-neutral-600 dark:text-neutral-400">
											This trailer is not currently assigned to a rental.
										</p>
									)}
								</div>
							</Card>
						</div>

						<div className="flex flex-wrap items-center justify-between gap-3">
							<ActionButton
								type="button"
								tone="primary"
								onClick={() => onSubmit(form)}
								disabled={submitting}
							>
								{submitting ? (
									<ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden="true" />
								) : (
									<CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
								)}
								Save Trailer
							</ActionButton>
						</div>
						{submitError ? <p className="text-sm font-medium text-red-600">{submitError}</p> : null}
					</>
				)}
			</div>
		</ScreenModal>
	);
}
