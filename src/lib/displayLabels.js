const LABEL_OVERRIDES = new Map([
	["draft", "Draft"],
	["draft_rental", "Draft"],
	["rental_draft", "Draft"],
	["request", "Request"],
	["agreement", "Agreement"],
	["customer_review", "Customer Review"],
	["changes_pending", "Changes Pending"],
	["awaiting_first_payment", "Awaiting First Payment"],
	["past_due", "Past Due"],
	["account_owner", "Account Owner"],
	["account_user", "Account User"],
	["manage_members", "Manage Members"],
	["manage_rentals", "Manage Rentals"],
	["manage_pickup", "Manage Pickup"],
	["view_billing", "View Billing"],
	["view_documents", "View Documents"],
	["view_rentals", "View Rentals"],
	["view_timeline", "View Timeline"],
	["initial_application", "Initial Application"],
	["new_rental", "New Rental"],
	["rental_expansion", "Rental Expansion"],
	["admin_created", "Admin Created"],
	["approved_as_agreement", "Approved as Agreement"],
	["merged_into_parent", "Merged into Parent Rental"],
	["login_access", "Login Access"],
	["general_update", "General Update"],
	["timeline_sign_documents", "Sign Documents"],
	["timeline_review_contract", "Review Contract"],
	["timeline_pick_up_trailer", "Pick Up Trailer"],
	["rental_charge", "Rental Charge"],
]);

function titleCase(value) {
	return value
		.split(" ")
		.filter(Boolean)
		.map((segment) =>
			segment.length <= 3 && segment === segment.toUpperCase()
				? segment
				: `${segment.charAt(0).toUpperCase()}${segment.slice(1).toLowerCase()}`
		)
		.join(" ");
}

export function prettifyEnumLabel(value, fallback = "Unknown") {
	if (value === null || value === undefined || value === "") return fallback;

	const rawValue = String(value).trim();
	if (!rawValue) return fallback;

	const normalizedKey = rawValue.toLowerCase().replace(/[\s-]+/g, "_");
	const override = LABEL_OVERRIDES.get(normalizedKey);
	if (override) return override;

	return titleCase(rawValue.replace(/[_-]+/g, " "));
}
