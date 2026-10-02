import { createHmac } from "node:crypto";
import { env } from "@/lib/server/env";
import { createAdminClient } from "@/lib/supabase/admin";

export type RateLimitRule = {
	/** Logical bucket name, e.g. "login:ip". */
	name: string;
	/** Raw identifier (IP, email, ...). It is hashed before storage. */
	identifier: string | null | undefined;
	windowSeconds: number;
	max: number;
};

export class RateLimitError extends Error {
	status = 429;
	constructor(message = "Too many requests. Please wait a few minutes and try again.") {
		super(message);
		this.name = "RateLimitError";
	}
}

function hashIdentifier(value: string) {
	// Identifiers (IPs, emails) are stored only as keyed hashes.
	return createHmac("sha256", env.SUPABASE_SECRET_KEY)
		.update(value.trim().toLowerCase())
		.digest("hex")
		.slice(0, 32);
}

export function getClientIp(request: Request) {
	const forwardedFor = request.headers.get("x-forwarded-for");
	if (forwardedFor) {
		const first = forwardedFor.split(",")[0]?.trim();
		if (first) return first;
	}
	return request.headers.get("x-real-ip")?.trim() || null;
}

/**
 * Consumes one hit from every rule. Throws RateLimitError when any rule is over its
 * limit. Fails open (logs) if the limiter itself is unavailable so a database hiccup
 * never blocks sign-in entirely.
 */
export async function enforceRateLimits(rules: RateLimitRule[]) {
	const applicable = rules.filter((rule) => rule.identifier);
	if (!applicable.length) return;

	const results = await Promise.all(
		applicable.map(async (rule) => {
			const { data, error } = await createAdminClient().rpc("consume_rate_limit", {
				p_key: `${rule.name}:${hashIdentifier(String(rule.identifier))}`,
				p_window_seconds: rule.windowSeconds,
				p_max: rule.max,
			});

			if (error) {
				console.error(`Rate limiter unavailable for ${rule.name}:`, error.message);
				return true;
			}

			return data !== false;
		})
	);

	if (results.some((allowed) => !allowed)) {
		throw new RateLimitError();
	}
}
