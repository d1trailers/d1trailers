"use client";

import { useMemo, useState } from "react";
import {
	ArrowPathIcon,
	CheckCircleIcon,
	EnvelopeIcon,
	ShieldCheckIcon,
	UserPlusIcon,
	XCircleIcon,
} from "@heroicons/react/24/outline";
import { TENANT_PERMISSION_VALUES } from "@/lib/contracts/account";

const PERMISSION_LABELS = {
	view_rentals: "View rentals",
	view_documents: "View documents",
	view_billing: "View billing",
	view_timeline: "View timeline",
	manage_pickup: "Manage pickup",
	manage_members: "Manage members",
};

function emptyInviteForm() {
	return {
		email: "",
		role: "account_user",
		permissions: ["view_timeline"],
	};
}

function uniquePermissions(values) {
	return [...new Set(values)];
}

export default function AccountUsersManager({ initialData }) {
	const [data, setData] = useState(initialData);
	const [inviteForm, setInviteForm] = useState(emptyInviteForm);
	const [inviteLoading, setInviteLoading] = useState(false);
	const [inviteMessage, setInviteMessage] = useState("");
	const [inviteError, setInviteError] = useState("");
	const [rowLoading, setRowLoading] = useState({});
	const [rowError, setRowError] = useState({});

	const actorIsOwner = data.activeTenant?.role === "account_owner";
	const permissionOptions = actorIsOwner
		? TENANT_PERMISSION_VALUES
		: TENANT_PERMISSION_VALUES.filter((permission) => permission !== "manage_members");

	const editableMembers = useMemo(
		() =>
			data.members.map((member) => ({
				...member,
				permissions: member.permissions || [],
			})),
		[data.members]
	);

	async function refreshMembers() {
		const response = await fetch("/api/account/members", {
			cache: "no-store",
		});
		const json = await response.json();
		if (!response.ok) {
			throw new Error(typeof json?.error === "string" ? json.error : "Unable to refresh account members.");
		}
		setData(json);
	}

	function toggleInvitePermission(permission) {
		setInviteForm((current) => {
			const nextPermissions = current.permissions.includes(permission)
				? current.permissions.filter((value) => value !== permission)
				: [...current.permissions, permission];
			return {
				...current,
				permissions: uniquePermissions(nextPermissions),
			};
		});
	}

	async function submitInvite(event) {
		event.preventDefault();
		setInviteLoading(true);
		setInviteError("");
		setInviteMessage("");

		try {
			const response = await fetch("/api/account/invitations", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: inviteForm.email,
					role: inviteForm.role,
					permissions: inviteForm.role === "account_owner" ? [] : inviteForm.permissions,
				}),
			});
			const json = await response.json().catch(() => ({}));

			if (!response.ok) {
				setInviteError(
					typeof json?.error === "string" ? json.error : "Unable to send invitation."
				);
				setInviteLoading(false);
				return;
			}

			setInviteMessage(`Invitation prepared for ${inviteForm.email}.`);
			setInviteForm(emptyInviteForm());
			await refreshMembers();
			setInviteLoading(false);
		} catch (error) {
			setInviteError(
				error instanceof Error ? error.message : "Unable to send invitation."
			);
			setInviteLoading(false);
		}
	}

	async function updateMember(memberId, payload) {
		setRowLoading((current) => ({ ...current, [memberId]: true }));
		setRowError((current) => ({ ...current, [memberId]: "" }));

		try {
			const response = await fetch(`/api/account/members/${memberId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});
			const json = await response.json().catch(() => ({}));
			if (!response.ok) {
				setRowError((current) => ({
					...current,
					[memberId]:
						typeof json?.error === "string"
							? json.error
							: "Unable to update this member.",
				}));
				setRowLoading((current) => ({ ...current, [memberId]: false }));
				return;
			}

			await refreshMembers();
			setRowLoading((current) => ({ ...current, [memberId]: false }));
		} catch (error) {
			setRowError((current) => ({
				...current,
				[memberId]:
					error instanceof Error ? error.message : "Unable to update this member.",
			}));
			setRowLoading((current) => ({ ...current, [memberId]: false }));
		}
	}

	async function updateInvitation(invitationId, action) {
		setRowLoading((current) => ({ ...current, [invitationId]: true }));
		setRowError((current) => ({ ...current, [invitationId]: "" }));

		try {
			const response = await fetch(`/api/account/invitations/${invitationId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ action }),
			});
			const json = await response.json().catch(() => ({}));
			if (!response.ok) {
				setRowError((current) => ({
					...current,
					[invitationId]:
						typeof json?.error === "string"
							? json.error
							: "Unable to update this invitation.",
				}));
				setRowLoading((current) => ({ ...current, [invitationId]: false }));
				return;
			}

			await refreshMembers();
			setRowLoading((current) => ({ ...current, [invitationId]: false }));
		} catch (error) {
			setRowError((current) => ({
				...current,
				[invitationId]:
					error instanceof Error
						? error.message
						: "Unable to update this invitation.",
			}));
			setRowLoading((current) => ({ ...current, [invitationId]: false }));
		}
	}

	return (
		<div className="space-y-6">
			<section className="surface-subtle rounded-2xl p-5 space-y-4">
				<div className="flex flex-wrap items-center gap-3">
					<UserPlusIcon className="h-6 w-6 text-(--branding-700)" aria-hidden="true" />
					<div>
						<h2 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
							Invite a User
						</h2>
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							Send account access to another teammate. Owners can invite other owners; delegated managers can invite account users.
						</p>
					</div>
				</div>

				<form onSubmit={submitInvite} className="grid gap-4">
					<div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
						<input
							type="email"
							value={inviteForm.email}
							onChange={(event) =>
								setInviteForm((current) => ({ ...current, email: event.target.value }))
							}
							required
							placeholder="user@company.com"
							className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950 dark:text-neutral-50"
						/>
						<select
							value={inviteForm.role}
							onChange={(event) =>
								setInviteForm((current) => ({
									...current,
									role: event.target.value,
									permissions:
										event.target.value === "account_owner"
											? []
											: current.permissions.length
												? current.permissions
												: ["view_timeline"],
								}))
							}
							className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950 dark:text-neutral-50"
						>
							<option value="account_user">Account User</option>
							{actorIsOwner ? <option value="account_owner">Account Owner</option> : null}
						</select>
					</div>

					{inviteForm.role === "account_user" ? (
						<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
							{permissionOptions.map((permission) => (
								<label
									key={permission}
									className="flex items-center gap-3 rounded-xl border border-(--border-soft) px-4 py-3 text-sm text-neutral-800 dark:text-neutral-100"
								>
									<input
										type="checkbox"
										checked={inviteForm.permissions.includes(permission)}
										onChange={() => toggleInvitePermission(permission)}
										className="h-4 w-4 rounded border-neutral-300 text-(--branding-700) focus:ring-(--branding-700)"
									/>
									<span>{PERMISSION_LABELS[permission]}</span>
								</label>
							))}
						</div>
					) : (
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							Account owners automatically receive full access, including member management.
						</p>
					)}

					<div className="flex flex-wrap items-center gap-3">
						<button
							type="submit"
							disabled={inviteLoading}
							className="inline-flex items-center justify-center gap-2 rounded-xl bg-(--branding-700) px-4 py-3 text-sm font-semibold text-neutral-50 transition hover:bg-(--branding-800) disabled:opacity-60"
						>
							{inviteLoading ? (
								<ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden="true" />
							) : (
								<EnvelopeIcon className="h-5 w-5" aria-hidden="true" />
							)}
							Send Invitation
						</button>
						{inviteMessage ? (
							<p className="text-sm font-medium text-emerald-600">{inviteMessage}</p>
						) : null}
						{inviteError ? (
							<p className="text-sm font-medium text-red-600">{inviteError}</p>
						) : null}
					</div>
				</form>
			</section>

			<section className="surface-subtle rounded-2xl p-5 space-y-4">
				<div className="flex flex-wrap items-center gap-3">
					<ShieldCheckIcon className="h-6 w-6 text-(--branding-700)" aria-hidden="true" />
					<div>
						<h2 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
							Account Members
						</h2>
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							Adjust access carefully. Changes apply the next time the user loads the account.
						</p>
					</div>
				</div>

				<div className="space-y-4">
					{editableMembers.map((member) => {
						const editablePermissionOptions =
							actorIsOwner || member.role === "account_user"
								? permissionOptions
								: permissionOptions.filter(
										(permission) => permission !== "manage_members"
								  );
						const busy = Boolean(rowLoading[member.id]);

						return (
							<MemberEditor
								key={member.id}
								member={member}
								permissionOptions={editablePermissionOptions}
								permissionLabels={PERMISSION_LABELS}
								actorIsOwner={actorIsOwner}
								loading={busy}
								error={rowError[member.id] || ""}
								onSave={updateMember}
							/>
						);
					})}
				</div>
			</section>

			<section className="surface-subtle rounded-2xl p-5 space-y-4">
				<div className="flex flex-wrap items-center gap-3">
					<EnvelopeIcon className="h-6 w-6 text-(--branding-700)" aria-hidden="true" />
					<div>
						<h2 className="font-syne text-2xl font-bold text-neutral-950 dark:text-neutral-50">
							Pending Invitations
						</h2>
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							Invitations are claimed automatically when the invited email logs in.
						</p>
					</div>
				</div>

				<div className="space-y-3">
					{data.invitations.length ? (
						data.invitations.map((invitation) => {
							const busy = Boolean(rowLoading[invitation.id]);
							const canEditInvitation =
								actorIsOwner ||
								(invitation.targetRole !== "account_owner" &&
									!invitation.permissionSnapshot.includes("manage_members"));
							return (
								<div
									key={invitation.id}
									className="rounded-2xl border border-(--border-soft) bg-white/80 p-4 dark:bg-neutral-950/60"
								>
									<div className="flex flex-wrap items-start justify-between gap-4">
										<div>
											<p className="font-semibold text-neutral-950 dark:text-neutral-50">
												{invitation.invitedEmail}
											</p>
											<p className="text-sm text-neutral-600 dark:text-neutral-400">
												{invitation.targetRole === "account_owner"
													? "Account Owner"
													: "Account User"}{" "}
												• {invitation.status}
											</p>
											{invitation.permissionSnapshot.length ? (
												<p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
													Permissions:{" "}
													{invitation.permissionSnapshot
														.map((permission) => PERMISSION_LABELS[permission])
														.join(", ")}
												</p>
											) : null}
										</div>
										<div className="flex flex-wrap gap-2">
											<button
												type="button"
												onClick={() => updateInvitation(invitation.id, "resend")}
												disabled={busy || !canEditInvitation}
												className="inline-flex items-center gap-2 rounded-xl border border-(--border-soft) px-3 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-100 dark:hover:bg-neutral-900"
											>
												{busy ? (
													<ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden="true" />
												) : (
													<CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
												)}
												Resend
											</button>
											<button
												type="button"
												onClick={() => updateInvitation(invitation.id, "revoke")}
												disabled={busy || !canEditInvitation}
												className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/40"
											>
												<XCircleIcon className="h-4 w-4" aria-hidden="true" />
												Revoke
											</button>
										</div>
									</div>
									{rowError[invitation.id] ? (
										<p className="mt-3 text-sm font-medium text-red-600">
											{rowError[invitation.id]}
										</p>
									) : null}
								</div>
							);
						})
					) : (
						<p className="text-sm text-neutral-600 dark:text-neutral-400">
							There are no pending invitations for this account yet.
						</p>
					)}
				</div>
			</section>
		</div>
	);
}

function MemberEditor({
	member,
	permissionOptions,
	permissionLabels,
	actorIsOwner,
	loading,
	error,
	onSave,
}) {
	const [role, setRole] = useState(member.role);
	const [isActive, setIsActive] = useState(member.isActive);
	const [permissions, setPermissions] = useState(member.permissions);
	const canEditMember = actorIsOwner || !member.permissions.includes("manage_members");

	function togglePermission(permission) {
		setPermissions((current) =>
			current.includes(permission)
				? current.filter((value) => value !== permission)
				: uniquePermissions([...current, permission])
		);
	}

	return (
		<div className="rounded-2xl border border-(--border-soft) bg-white/80 p-4 dark:bg-neutral-950/60">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p className="font-semibold text-neutral-950 dark:text-neutral-50">
						{member.displayName || member.email || "Unknown user"}
					</p>
					<p className="text-sm text-neutral-600 dark:text-neutral-400">{member.email || "No email on file"}</p>
				</div>
				<div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
					<span>{member.isActive ? "Active" : "Inactive"}</span>
					<span>•</span>
					<span>{member.role === "account_owner" ? "Owner" : "User"}</span>
				</div>
			</div>

			<div className="mt-4 grid gap-4 md:grid-cols-[0.85fr_0.85fr_1fr]">
				<select
					value={role}
					onChange={(event) => setRole(event.target.value)}
					disabled={!actorIsOwner || !canEditMember}
					className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-(--branding-700) disabled:opacity-60 dark:bg-neutral-950 dark:text-neutral-50"
				>
					<option value="account_user">Account User</option>
					{actorIsOwner ? <option value="account_owner">Account Owner</option> : null}
				</select>

				<label className="flex items-center gap-3 rounded-xl border border-(--border-soft) px-4 py-3 text-sm text-neutral-800 dark:text-neutral-100">
					<input
						type="checkbox"
						checked={isActive}
						onChange={(event) => setIsActive(event.target.checked)}
						disabled={!canEditMember}
						className="h-4 w-4 rounded border-neutral-300 text-(--branding-700) focus:ring-(--branding-700)"
					/>
					<span>Member is active</span>
				</label>

				<button
					type="button"
					onClick={() =>
						onSave(member.id, {
							role,
							isActive,
							permissions: role === "account_owner" ? [] : permissions,
						})
					}
					disabled={loading || !canEditMember}
					className="inline-flex items-center justify-center gap-2 rounded-xl bg-(--branding-700) px-4 py-3 text-sm font-semibold text-neutral-50 transition hover:bg-(--branding-800) disabled:opacity-60"
				>
					{loading ? (
						<ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden="true" />
					) : (
						<CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
					)}
					Save Access
				</button>
			</div>

			{role === "account_user" ? (
				<div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					{permissionOptions.map((permission) => (
						<label
							key={permission}
							className="flex items-center gap-3 rounded-xl border border-(--border-soft) px-4 py-3 text-sm text-neutral-800 dark:text-neutral-100"
						>
							<input
								type="checkbox"
								checked={permissions.includes(permission)}
								onChange={() => togglePermission(permission)}
								disabled={!canEditMember}
								className="h-4 w-4 rounded border-neutral-300 text-(--branding-700) focus:ring-(--branding-700)"
							/>
							<span>{permissionLabels[permission]}</span>
						</label>
					))}
				</div>
			) : (
				<p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
					Account owners automatically receive full account visibility and member-management access.
				</p>
			)}

			{error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
		</div>
	);
}
