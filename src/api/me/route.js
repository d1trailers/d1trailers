import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getSheetRows } from "@/lib/sheets";

export async function GET(req) {
	const session = await getServerSession(authOptions);

	if (!session)
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
		});

	const email = session.user.email;

	const clients = await getSheetRows("Clients!A:F");
	const rentals = await getSheetRows("Rentals!A:F");
	const documents = await getSheetRows("Documents!A:D");

	const client = clients.find((row) => row[0] === email);
	const userRentals = rentals.filter((row) => row[0] === email);
	const userDocuments = documents.filter((row) => row[0] === email);

	return new Response(
		JSON.stringify({ client, rentals: userRentals, documents: userDocuments })
	);
}
