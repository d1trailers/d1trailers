import {
	getClientByEmail,
	getRentalsByEmail,
	getDocumentsByEmail,
} from "@/lib/airtable";

export async function GET(req) {
	const email = req.cookies.get("email")?.value;

	if (!email) {
		return Response.json(
			{ error: "Unauthorized: missing email cookie" },
			{ status: 401 }
		);
	}

	const client = await getClientByEmail(email);

	if (!client) {
		return Response.json({ error: "Customer not found" }, { status: 404 });
	}

	const rentals = await getRentalsByEmail(email);
	const documents = await getDocumentsByEmail(email);

	return Response.json({
		customer: {
			companyName: client.companyName,
			primaryEmail: client.primaryEmail,
			status: client.status,
		},

		rentals,

		documents,
	});
}
