import Link from "next/link";
import Card from "@/components/ui/Card";
import { ClockIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";

const REASON_COPY = {
	expired: {
		title: "Link Expired",
		message:
			"This login link has expired for security. Request a new link to continue.",
		icon: ClockIcon,
	},
	invalid: {
		title: "Link Invalid",
		message:
			"This login link is no longer valid. Request a fresh link and use the most recent email.",
		icon: ExclamationCircleIcon,
	},
	missing: {
		title: "Link Incomplete",
		message:
			"The login link was missing required information. Request a new link and try again.",
		icon: ExclamationCircleIcon,
	},
};

export default async function ExpiredMagicLinkPage({ searchParams }) {
	const params = await searchParams;
	const reason = typeof params?.reason === "string" ? params.reason : "expired";
	const content = REASON_COPY[reason] || REASON_COPY.expired;
	const Icon = content.icon;

	return (
		<div className="flex min-h-screen w-full items-center justify-center p-5">
			<Card className="w-full max-w-lg p-8 gap-6 text-center sm:text-left">
				<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 sm:mx-0 dark:bg-amber-950/40 dark:text-amber-300">
					<Icon className="h-7 w-7" />
				</div>
				<section className="space-y-2">
					<p className="text-xs uppercase tracking-[0.14em] text-neutral-600 dark:text-neutral-400">
						Portal Access
					</p>
					<h1 className="text-2xl font-bold">{content.title}</h1>
					<p className="text-sm text-neutral-600 dark:text-neutral-400">
						{content.message}
					</p>
				</section>
				<div className="flex flex-wrap justify-center gap-3 sm:justify-start">
					<Link
						href="/login"
						className="rounded-xl bg-(--branding-700) px-4 py-3 text-sm font-semibold text-neutral-50 transition hover:bg-(--branding-800)"
					>
						Request New Link
					</Link>
					<Link
						href="/"
						className="rounded-xl border border-(--border-soft) px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-900"
					>
						Return Home
					</Link>
				</div>
			</Card>
		</div>
	);
}
