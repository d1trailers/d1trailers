import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/server/env";
import {
	reconcileUserContextByIdentity,
	resolvePostLoginDestination,
} from "@/lib/server/services/access";

function redirectWithCookies(
	fromResponse: NextResponse,
	destination: URL
) {
	const nextResponse = NextResponse.redirect(destination);
	fromResponse.cookies.getAll().forEach((cookie) => {
		nextResponse.cookies.set(cookie);
	});
	return nextResponse;
}

export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get("code");
	const tokenHash = requestUrl.searchParams.get("token_hash");
	const otpType = requestUrl.searchParams.get("type") as EmailOtpType | null;
	const errorCode = requestUrl.searchParams.get("error_code");

	if (!code && !tokenHash) {
		const reason = errorCode ? "invalid" : "missing";
		return NextResponse.redirect(new URL(`/login/expired?reason=${reason}`, env.APP_BASE_URL));
	}

	let response = NextResponse.redirect(new URL("/", env.APP_BASE_URL));

	const supabase = createServerClient(
		env.NEXT_PUBLIC_SUPABASE_URL,
		env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) => {
						request.cookies.set(name, value);
						response.cookies.set(name, value, options as CookieOptions);
					});
				},
			},
		}
	);

	if (tokenHash && otpType) {
		const { error } = await supabase.auth.verifyOtp({
			type: otpType,
			token_hash: tokenHash,
		});

		if (error) {
			console.error("Supabase auth token-hash verification failed:", error);
			return NextResponse.redirect(
				new URL("/login/expired?reason=invalid", env.APP_BASE_URL)
			);
		}
	} else if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (error) {
			console.error("Supabase auth callback failed:", error);
			return NextResponse.redirect(
				new URL("/login/expired?reason=invalid", env.APP_BASE_URL)
			);
		}
	} else {
		return NextResponse.redirect(
			new URL("/login/expired?reason=missing", env.APP_BASE_URL)
		);
	}

	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();

	if (userError || !user?.id || !user.email) {
		return NextResponse.redirect(new URL("/login/expired?reason=invalid", env.APP_BASE_URL));
	}

	const context = await reconcileUserContextByIdentity({
		userId: user.id,
		email: user.email,
	});

	response = redirectWithCookies(
		response,
		new URL(resolvePostLoginDestination(context), env.APP_BASE_URL)
	);
	return response;
}
