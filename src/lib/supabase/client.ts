import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function createClient() {
	if (!supabaseUrl || !supabasePublishableKey) {
		throw new Error("Supabase browser client is not configured.");
	}

	return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
