import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import {
	ADMIN_COOKIE_NAME,
	isAdminEmailAllowlisted,
	verifyAdminSessionToken,
} from "@/lib/adminAuth";

export default async function AdminProtectedLayout({ children }) {
	const cookieStore = await cookies();
	const sessionToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
	const email = verifyAdminSessionToken(sessionToken);

	if (!email || !isAdminEmailAllowlisted(email)) {
		redirect("/admin/login");
	}

	return <AdminShell adminEmail={email}>{children}</AdminShell>;
}
