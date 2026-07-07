function formatIntakeValue(value) {
	if (Array.isArray(value)) {
		return value.filter(Boolean).join(", ") || "-";
	}

	if (typeof value === "boolean") {
		return value ? "Yes" : "No";
	}

	const normalizedValue =
		typeof value === "string" ? value.trim() : String(value ?? "").trim();
	return normalizedValue || "-";
}

export function buildApplicationIntakeSummary(application) {
	const sections = [
		{
			title: "Owner Information",
			entries: [
				["Principal Owner", [application.ownerFirstName, application.ownerLastName]],
				["Partner", [application.partnerFirstName, application.partnerLastName]],
				["Email", application.email],
				["Phone", application.phone],
			],
		},
		{
			title: "Owner Address",
			entries: [
				["Street Address", application.ownerAddress],
				["City", application.ownerCity],
				["Country / Region", application.ownerRegion],
				["Zip / Postal Code", application.ownerZip],
			],
		},
		{
			title: "Company Information",
			entries: [
				["Company Name", application.companyName],
				["Street Address", application.companyAddress],
				["City", application.companyCity],
				["Country / Region", application.companyRegion],
				["Zip / Postal Code", application.companyZip],
			],
		},
		{
			title: "Compliance Details",
			entries: [
				["Federal Tax ID (EIN)", application.ein],
				["MC Number", application.mcNumber],
				["USDOT Number", application.usdot],
			],
		},
		{
			title: "Personal References",
			entries: [
				["Reference 1", [application.ref1Name, application.ref1Phone]],
				["Reference 2", [application.ref2Name, application.ref2Phone]],
				["Reference 3", [application.ref3Name, application.ref3Phone]],
			],
		},
		{
			title: "Identity Verification",
			entries: [["SSN", application.ssn]],
		},
		{
			title: "Agreements",
			entries: [
				["SSN Authorization", application.ssnAuth],
				["Insurance Agreement", application.insurance],
				["Maintenance Agreement", application.maintenance],
			],
		},
	];

	return sections
		.map((section) => {
			const lines = section.entries.map(
				([label, value]) => `${label}: ${formatIntakeValue(value)}`
			);
			return `${section.title}\n${lines.join("\n")}`;
		})
		.join("\n\n");
}
