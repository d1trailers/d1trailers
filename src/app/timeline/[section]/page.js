import { redirect } from "next/navigation";

const VALID_SECTIONS = new Set(["overview", "rentals", "billing", "users"]);

export default async function TimelineSectionPage({ params }) {
	const resolvedParams = await params;
	const section = VALID_SECTIONS.has(resolvedParams?.section)
		? resolvedParams.section
		: "overview";

	redirect(`/portal/${section}`);
}
