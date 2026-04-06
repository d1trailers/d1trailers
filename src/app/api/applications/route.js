import { createApplicationSubmission } from "@/lib/applicationSubmission";

export async function POST(req) {
	try {
		const formData = await req.formData();
		const applicationInput = {};
		for (const [key, value] of formData.entries()) {
			if (value instanceof File) continue;
			applicationInput[key] = value;
		}

		applicationInput.ssnAuth = formData.get("ssnAuth") === "on";
		applicationInput.insurance = formData.get("insurance") === "on";
		applicationInput.maintenance = formData.get("maintenance") === "on";

		const filesByFieldName = {
			utilityBill1: formData.get("utilityBill1"),
			utilityBill2: formData.get("utilityBill2"),
			licenseFront: formData.get("licenseFront"),
			licenseBack: formData.get("licenseBack"),
			tractorPlate: formData.get("tractorPlate"),
		};

		const result = await createApplicationSubmission(applicationInput, filesByFieldName);
		return Response.json(result, { status: 201 });
	} catch (error) {
		console.error("Failed to submit rental application:", error);
		const message = typeof error?.message === "string" ? error.message : "Failed to submit application.";
		const status = /already exists/i.test(message)
			? 409
			: /required|valid|checkbox|5 MB/i.test(message)
				? 400
				: 500;
		return Response.json({ error: message }, { status });
	}
}
