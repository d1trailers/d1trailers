"use client";

import { createClient } from "@/lib/supabase/client";

export default function LogoutButton({ className = "" }) {
	async function handleLogout() {
		const supabase = createClient();
		await supabase.auth.signOut();
		window.location.href = "/login";
	}

	return (
		<button type="button" onClick={handleLogout} className={className}>
			Log Out
		</button>
	);
}
