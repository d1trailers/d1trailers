import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function updateSession(request: NextRequest) {
	if (!supabaseUrl || !supabasePublishableKey) {
		return NextResponse.next({ request });
	}

	let response = NextResponse.next({ request });

	const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
		cookies: {
			getAll() {
				return request.cookies.getAll();
			},
			setAll(cookiesToSet) {
				response = NextResponse.next({ request });
				cookiesToSet.forEach(({ name, value, options }) => {
					request.cookies.set(name, value);
					response.cookies.set(name, value, options as CookieOptions);
				});
			},
		},
	});

	await supabase.auth.getUser();
	return response;
}
