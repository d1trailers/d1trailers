"use client";

import { useEffect, useMemo, useState } from "react";
import {
	ArrowPathIcon,
	EnvelopeIcon,
	ShieldCheckIcon,
	UserPlusIcon,
} from "@heroicons/react/24/outline";
import {
	TENANT_PERMISSION_LABELS,
	TENANT_PERMISSION_VALUES,
} from "@/lib/contracts/account";
import ActionButton from "@/components/ui/ActionButton";
import Card from "@/components/ui/Card";
import ScreenModal from "@/components/ui/ScreenModal";
import StatusBadge from "@/components/admin/StatusBadge";
import SearchInput from "@/components/portal/SearchInput";

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

function PermissionList({ permissions, isOwner = false }) {
	if (!permissions.length) {
		return (
			<p className="text-xs text-neutral-500 dark:text-neutral-400">
				{isOwner ? "Full owner access" : "No delegated permissions"}
			</p>
		);
	}

	return (
		<div className="flex flex-wrap gap-2">
			{permissions.map((permission) => (
				<span
					key={permission}
					className="rounded-full border border-(--border-soft) bg-white/80 px-3 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-950/60 dark:text-neutral-200"
				>
					{TENANT_PERMISSION_LABELS[permission]}
				</span>
			))}
		</div>
	);
}

function PermissionCheckboxes({
	permissionOptions,
	selectedPermissions,
	onToggle,
	disabled = false,
}) {
	return (
		<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
			{permissionOptions.map((permission) => (
				<label
					key={permission}
					className="flex items-center gap-3 rounded-xl border border-(--border-soft) px-4 py-3 text-sm text-neutral-800 dark:text-neutral-100"
				>
					<input
						type="checkbox"
						checked={selectedPermissions.includes(permission)}
						onChange={() => onToggle(permission)}
						disabled={disabled}
						className="h-4 w-4 rounded border-neutral-300"
					/>
					<span>{TENANT_PERMISSION_LABELS[permission]}</span>
				</label>
			))}
		</div>
	);
}

function UserManagementModal({
	open,
	onClose,
	mode,
	actorIsOwner,
	permissionOptions,
	member,
	invitation,
	inviteForm,
	onInviteFormChange,
	onToggleInvitePermission,
	onSubmitInvite,
	onSaveMember,
	onUpdateInvitation,
	loading,
	error,
	actorProfileId,
}) {
	const [memberDraft, setMemberDraft] = useState(member);

	useEffect(() => {
		setMemberDraft(member);
	}, [member]);

	if (!open) return null;

	const canEditInvitation =
		!invitation ||
		actorIsOwner ||
		(invitation.targetRole !== "account_owner" &&
			!invitation.permissionSnapshot.includes("manage_members"));
	const canEditMember =
		!member ||
		(actorIsOwner || !member.permissions.includes("manage_members"));
	const isSelfMember = member?.profileId === actorProfileId;
	const memberPermissionOptions =
		actorIsOwner || member?.role === "account_user"
			? permissionOptions
			: permissionOptions.filter((permission) => permission !== "manage_members");

	function toggleMemberPermission(permission) {
		setMemberDraft((current) => ({
			...current,
			permissions: current.permissions.includes(permission)
				? current.permissions.filter((value) => value !== permission)
				: uniquePermissions([...current.permissions, permission]),
		}));
	}

	return (
		<ScreenModal
			open={open}
			onClose={onClose}
			closeLabel="Close user management"
			maxWidthClass="max-w-4xl"
		>
			<div className="space-y-5">
				<div className="space-y-2">
					<p className="text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
						Users
					</p>
					<h2 className="font-syne text-3xl font-bold text-neutral-950 dark:text-neutral-50">
						{mode === "invite"
							? "Invite User"
							: mode === "member"
								? "User Access"
								: "Invitation"}
					</h2>
				</div>

				{mode === "invite" ? (
					<div className="space-y-4">
						<div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
							<input
								type="email"
								value={inviteForm.email}
								onChange={(event) =>
									onInviteFormChange((current) => ({
										...current,
										email: event.target.value,
									}))
								}
								required
								placeholder="user@company.com"
								className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-(--branding-700) dark:bg-neutral-950 dark:text-neutral-50"
							/>
							<select
								value={inviteForm.role}
								onChange={(event) =>
									onInviteFormChange((current) => ({
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
							<PermissionCheckboxes
								permissionOptions={permissionOptions}
								selectedPermissions={inviteForm.permissions}
								onToggle={onToggleInvitePermission}
							/>
						) : null}

						<div className="flex justify-end">
							<ActionButton type="button" tone="primary" onClick={onSubmitInvite} disabled={loading}>
								{loading ? (
									<ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden="true" />
								) : (
									<EnvelopeIcon className="h-5 w-5" aria-hidden="true" />
								)}
								Send Invitation
							</ActionButton>
						</div>
					</div>
				) : null}

				{mode === "member" && memberDraft ? (
					<div className="space-y-4">
						<Card>
							<div className="space-y-2">
								<p className="font-semibold text-neutral-950 dark:text-neutral-50">
									{memberDraft.displayName || memberDraft.email || "Unknown user"}
								</p>
								<p className="text-sm text-neutral-600 dark:text-neutral-400">
									{memberDraft.email || "No email on file"}
								</p>
							</div>
						</Card>

						<div className="grid gap-4 md:grid-cols-[0.85fr_0.85fr]">
							<select
								value={memberDraft.role}
								onChange={(event) =>
									setMemberDraft((current) => ({
										...current,
										role: event.target.value,
										permissions:
											event.target.value === "account_owner" ? [] : current.permissions,
									}))
								}
								disabled={!actorIsOwner || !canEditMember || isSelfMember}
								className="w-full rounded-xl border border-(--border-soft) bg-white px-4 py-3 text-sm text-neutral-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-(--branding-700) disabled:opacity-60 dark:bg-neutral-950 dark:text-neutral-50"
							>
								<option value="account_user">Account User</option>
								{actorIsOwner ? <option value="account_owner">Account Owner</option> : null}
							</select>

							<label className="flex items-center gap-3 rounded-xl border border-(--border-soft) px-4 py-3 text-sm text-neutral-800 dark:text-neutral-100">
								<input
									type="checkbox"
									checked={memberDraft.isActive}
									onChange={(event) =>
										setMemberDraft((current) => ({
											...current,
											isActive: event.target.checked,
										}))
									}
									disabled={!canEditMember || isSelfMember}
									className="h-4 w-4 rounded border-neutral-300"
								/>
								<span>Member is active</span>
							</label>
						</div>

						{memberDraft.role === "account_user" ? (
							<PermissionCheckboxes
								permissionOptions={memberPermissionOptions}
								selectedPermissions={memberDraft.permissions}
								onToggle={toggleMemberPermission}
								disabled={!canEditMember || isSelfMember}
							/>
						) : null}

						{isSelfMember ? (
							<p className="text-sm font-medium text-amber-600">
								Use another owner account to change your own access.
							</p>
						) : null}

						<div className="flex justify-end">
							<ActionButton
								type="button"
								tone="primary"
								onClick={() =>
									onSaveMember(memberDraft.id, {
										role: memberDraft.role,
										isActive: memberDraft.isActive,
										permissions:
											memberDraft.role === "account_owner" ? [] : memberDraft.permissions,
									})
								}
								disabled={loading || !canEditMember || isSelfMember}
							>
								{loading ? (
									<ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden="true" />
								) : (
									<ShieldCheckIcon className="h-5 w-5" aria-hidden="true" />
								)}
								Save Access
							</ActionButton>
						</div>
					</div>
				) : null}

				{mode === "invitation" && invitation ? (
					<div className="space-y-4">
						<Card>
							<div className="space-y-2">
								<p className="font-semibold text-neutral-950 dark:text-neutral-50">
									{invitation.invitedEmail}
								</p>
								<p className="text-sm text-neutral-600 dark:text-neutral-400">
									{invitation.targetRole === "account_owner" ? "Account Owner" : "Account User"}
								</p>
								<PermissionList
									permissions={invitation.permissionSnapshot}
									isOwner={invitation.targetRole === "account_owner"}
								/>
							</div>
						</Card>

						<div className="flex flex-wrap justify-end gap-3">
							<ActionButton
								type="button"
								tone="neutral"
								onClick={() => onUpdateInvitation(invitation.id, "resend")}
								disabled={loading || !canEditInvitation}
							>
								{loading ? (
									<ArrowPathIcon className="h-5 w-5 animate-spin" aria-hidden="true" />
								) : (
									<EnvelopeIcon className="h-5 w-5" aria-hidden="true" />
								)}
								Resend Invitation
							</ActionButton>
							<ActionButton
								type="button"
								tone="danger"
								onClick={() => onUpdateInvitation(invitation.id, "revoke")}
								disabled={loading || !canEditInvitation}
							>
								Revoke Invitation
							</ActionButton>
						</div>
					</div>
				) : null}

				{error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
			</div>
		</ScreenModal>
	);
}

export default function AccountUsersManager({ initialData }) {
	const [data, setData] = useState(initialData);
	const [inviteForm, setInviteForm] = useState(emptyInviteForm);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [search, setSearch] = useState("");
	const [modalState, setModalState] = useState({
		open: false,
		mode: "invite",
		member: null,
		invitation: null,
	});

	const actorIsOwner = data.activeTenant?.role === "account_owner";
	const permissionOptions = actorIsOwner
		? TENANT_PERMISSION_VALUES
		: TENANT_PERMISSION_VALUES.filter((permission) => permission !== "manage_members");

	const members = useMemo(
		() =>
			data.members.map((member) => ({
				...member,
				permissions: member.permissions || [],
			})),
		[data.members]
	);

	const combinedItems = useMemo(() => {
		const memberItems = members.map((member) => ({
			id: `member-${member.id}`,
			type: "member",
			searchValue: `${member.displayName || member.email || ""}`.toLowerCase(),
			title: member.displayName || member.email || "Unknown user",
			subtitle: member.email || "No email on file",
			status: member.isActive ? "Active" : "Inactive",
			secondaryStatus: member.role === "account_owner" ? "Owner" : "User",
			permissions: member.permissions,
			member,
		}));
		const invitationItems = data.invitations.map((invitation) => ({
			id: `invitation-${invitation.id}`,
			type: "invitation",
			searchValue: invitation.invitedEmail.toLowerCase(),
			title: invitation.invitedEmail,
			subtitle: invitation.invitedBy ? `Invited by ${invitation.invitedBy}` : "Invitation pending",
			status: "Pending",
			secondaryStatus: invitation.targetRole === "account_owner" ? "Owner" : "User",
			permissions: invitation.permissionSnapshot || [],
			invitation,
		}));

		return [...memberItems, ...invitationItems];
	}, [data.invitations, members]);

	const filteredItems = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return combinedItems;
		return combinedItems.filter((item) => item.searchValue.includes(query));
	}, [combinedItems, search]);

	async function refreshMembers() {
		const response = await fetch("/api/account/members", { cache: "no-store" });
		const json = await response.json().catch(() => ({}));
		if (!response.ok) {
			throw new Error(typeof json?.error === "string" ? json.error : "Unable to refresh users.");
		}
		setData(json);
	}

	function toggleInvitePermission(permission) {
		setInviteForm((current) => ({
			...current,
			permissions: current.permissions.includes(permission)
				? current.permissions.filter((value) => value !== permission)
				: uniquePermissions([...current.permissions, permission]),
		}));
	}

	function closeModal() {
		setModalState({ open: false, mode: "invite", member: null, invitation: null });
		setError("");
	}

	async function submitInvite() {
		setLoading(true);
		setError("");

		try {
			const response = await fetch("/api/account/invitations", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: inviteForm.email,
					role: inviteForm.role,
					permissions: inviteForm.role === "account_owner" ? [] : inviteForm.permissions,
				}),
			});
			const json = await response.json().catch(() => ({}));

			if (!response.ok) {
				setError(typeof json?.error === "string" ? json.error : "Unable to send invitation.");
				setLoading(false);
				return;
			}

			setInviteForm(emptyInviteForm());
			setLoading(false);
			await refreshMembers();
			closeModal();
		} catch (submissionError) {
			setError(
				submissionError instanceof Error
					? submissionError.message
					: "Unable to send invitation."
			);
			setLoading(false);
		}
	}

	async function saveMember(memberId, payload) {
		setLoading(true);
		setError("");

		try {
			const response = await fetch(`/api/account/members/${memberId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const json = await response.json().catch(() => ({}));

			if (!response.ok) {
				setError(typeof json?.error === "string" ? json.error : "Unable to update user.");
				setLoading(false);
				return;
			}

			setLoading(false);
			await refreshMembers();
			closeModal();
		} catch (updateError) {
			setError(updateError instanceof Error ? updateError.message : "Unable to update user.");
			setLoading(false);
		}
	}

	async function updateInvitation(invitationId, action) {
		setLoading(true);
		setError("");

		try {
			const response = await fetch(`/api/account/invitations/${invitationId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action }),
			});
			const json = await response.json().catch(() => ({}));

			if (!response.ok) {
				setError(typeof json?.error === "string" ? json.error : "Unable to update invitation.");
				setLoading(false);
				return;
			}

			setLoading(false);
			await refreshMembers();
			closeModal();
		} catch (updateError) {
			setError(
				updateError instanceof Error ? updateError.message : "Unable to update invitation."
			);
			setLoading(false);
		}
	}

	return (
		<>
			<div className="space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<SearchInput
						value={search}
						onChange={setSearch}
						placeholder="Search users"
					/>
					<ActionButton
						type="button"
						tone="primary"
						onClick={() =>
							setModalState({ open: true, mode: "invite", member: null, invitation: null })
						}
					>
						<UserPlusIcon className="h-5 w-5" aria-hidden="true" />
						Invite User
					</ActionButton>
				</div>

				{filteredItems.length ? (
					<div className="space-y-3">
						{filteredItems.map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() =>
									setModalState(
										item.type === "member"
											? { open: true, mode: "member", member: item.member, invitation: null }
											: {
													open: true,
													mode: "invitation",
													member: null,
													invitation: item.invitation,
											  },
									)
								}
								className="w-full rounded-2xl border border-(--border-soft) bg-white/80 p-4 text-left transition hover:border-(--branding-700) hover:bg-white dark:bg-neutral-950/60"
							>
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div className="space-y-1">
										<p className="font-semibold text-neutral-950 dark:text-neutral-50">{item.title}</p>
										<p className="text-sm text-neutral-600 dark:text-neutral-400">{item.subtitle}</p>
									</div>
									<div className="flex flex-wrap gap-2">
										<StatusBadge status={item.status} />
										<StatusBadge status={item.secondaryStatus} />
									</div>
								</div>
								<div className="mt-3">
									<PermissionList
										permissions={item.permissions}
										isOwner={item.secondaryStatus === "Owner"}
									/>
								</div>
							</button>
						))}
					</div>
				) : (
					<Card>
						<p className="text-sm text-neutral-600 dark:text-neutral-400">No users match this search.</p>
					</Card>
				)}

				{error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
			</div>

			<UserManagementModal
				open={modalState.open}
				onClose={closeModal}
				mode={modalState.mode}
				actorIsOwner={actorIsOwner}
				permissionOptions={permissionOptions}
				member={modalState.member}
				invitation={modalState.invitation}
				inviteForm={inviteForm}
				onInviteFormChange={setInviteForm}
				onToggleInvitePermission={toggleInvitePermission}
				onSubmitInvite={submitInvite}
				onSaveMember={saveMember}
				onUpdateInvitation={updateInvitation}
				loading={loading}
				error={error}
				actorProfileId={data.actorProfileId}
			/>
		</>
	);
}
