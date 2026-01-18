import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import {
	getClientByEmail,
	getRentalsByEmail,
	getDocumentsByEmail,
} from "@/lib/airtable";

export async function GET() {
	const session = await getServerSession(authOptions);

	if (!session || !session.user?.email) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
		});
	}

	const email = session.user.email;

	const client = await getClientByEmail(email);
	const rentals = await getRentalsByEmail(email);
	const documents = await getDocumentsByEmail(email);

	return new Response(
		JSON.stringify({
			client,
			rentals,
			documents,
		}),
		{ status: 200 }
	);
}
