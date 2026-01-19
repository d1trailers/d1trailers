import Airtable from "airtable";

const base = new Airtable({
	apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_BASE_ID);

export async function getClientByEmail(email) {
	const records = await base("Customers")
		.select({
			filterByFormula: `{Primary Email} = '${email}'`,
			maxRecords: 1,
		})
		.firstPage();

	if (!records.length) return null;

	const r = records[0];

	return {
		id: r.id,
		companyName: r.get("Company Name"),
		email: r.get("Primary Email"),
		status: r.get("Status"),
		stripeCustomerId: r.get("Stripe Customer ID"),
	};
}

export async function getRentalsByEmail(email) {
	const customers = await base("Customers")
		.select({
			filterByFormula: `{Primary Email} = '${email}'`,
			maxRecords: 1,
		})
		.firstPage();

	if (!customers.length) return [];

	const customerId = customers[0].id;

	const rentals = await base("Rentals")
		.select({
			filterByFormula: `FIND('${customerId}', ARRAYJOIN({Customer}))`,
		})
		.all();

	return rentals.map((r) => ({
		id: r.id,
		status: r.get("Status"),
		startDate: r.get("Start Date"),
		endDate: r.get("End Date"),
		billingFrequency: r.get("Billing Frequency"),
		rate: r.get("Rate"),
		currentPeriodEnd: r.get("Current Period End"),

		stripe: {
			subscriptionId: r.get("Stripe Subscription ID"),
			productId: r.get("Stripe Product ID"),
			priceId: r.get("Stripe Price ID"),
			lastInvoiceId: r.get("Last Invoice ID"),
		},

		trailer: r.get("Trailer")?.[0] ?? null,
	}));
}

export async function getTrailerById(trailerId) {
	if (!trailerId) return null;

	const record = await base("Trailers").find(trailerId);

	return {
		id: record.id,
		unitNumber: record.get("Unit Number"),
		plate: record.get("Plate Number"),
		type: record.get("Type"),
		year: record.get("Year"),
		vin: record.get("VIN"),
		status: record.get("Status"),
	};
}

export async function getDocumentsByEmail(email) {
	const customers = await base("Customers")
		.select({
			filterByFormula: `{Primary Email} = '${email}'`,
			maxRecords: 1,
		})
		.firstPage();

	if (!customers.length) return [];

	const customerId = customers[0].id;

	const docs = await base("Documents")
		.select({
			filterByFormula: `FIND('${customerId}', ARRAYJOIN({Customer}))`,
		})
		.all();

	return docs.map((d) => ({
		id: d.id,
		name: d.get("Name"),
		type: d.get("Type"),
		file: d.get("File")?.[0]?.url ?? null,
		stripeInvoiceId: d.get("Stripe Invoice ID") ?? null,
	}));
}
