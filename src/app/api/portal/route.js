import {
	getClientByEmail,
	getRentalsByEmail,
	getDocumentsByEmail,
} from "@/lib/airtable";

export async function GET(req) {
	const email = req.cookies.get("email")?.value;

	if (!email) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
		});
	}

	const client = await getClientByEmail(email);
	const rentals = await getRentalsByEmail(email);
	const documents = await getDocumentsByEmail(email);

	return new Response(JSON.stringify({ client, rentals, documents }), {
		status: 200,
	});
}
