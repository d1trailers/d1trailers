import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function assertSupabaseEnv() {
	if (!supabaseUrl || !supabasePublishableKey) {
		throw new Error("Supabase environment is not configured.");
	}
}

export async function createClient() {
	assertSupabaseEnv();
	const cookieStore = await cookies();
	const url = supabaseUrl as string;
	const publishableKey = supabasePublishableKey as string;

	return createServerClient(url, publishableKey, {
		cookies: {
			getAll() {
				return cookieStore.getAll();
			},
			setAll(cookiesToSet) {
				try {
					cookiesToSet.forEach(({ name, value, options }) =>
						cookieStore.set(name, value, options as CookieOptions)
					);
				} catch {
					// Server Components cannot always mutate cookies directly.
					// Middleware is responsible for refreshing persisted auth state.
				}
			},
		},
	});
}
