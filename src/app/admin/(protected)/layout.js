import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { getCurrentUserContext, isStaffContext } from "@/lib/server/services/access";

export default async function AdminProtectedLayout({ children }) {
	const context = await getCurrentUserContext();

	if (!context || !isStaffContext(context)) {
		redirect("/login");
	}

	return <AdminShell adminEmail={context.email}>{children}</AdminShell>;
}
