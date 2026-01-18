import Airtable from "airtable";

const base = new Airtable({
	apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_BASE_ID);

export async function getClientByEmail(email) {
	const records = await base("Clients")
		.select({
			filterByFormula: `{Email} = "${email}"`,
			maxRecords: 1,
		})
		.firstPage();

	return records.length ? records[0].fields : null;
}

export async function getRentalsByEmail(email) {
	const records = await base("Rentals")
		.select({
			filterByFormula: `{Email} = "${email}"`,
		})
		.firstPage();

	return records.map((r) => r.fields);
}

export async function getDocumentsByEmail(email) {
	const records = await base("Documents")
		.select({
			filterByFormula: `{Email} = "${email}"`,
		})
		.firstPage();

	return records.map((r) => r.fields);
}
