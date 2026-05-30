import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

let adminClient: SupabaseClient | null = null;

export function createAdminClient() {
	if (adminClient) return adminClient;

	if (!supabaseUrl || !supabaseSecretKey) {
		throw new Error("Supabase admin client is not configured.");
	}

	adminClient = createClient(supabaseUrl, supabaseSecretKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});

	return adminClient;
}
