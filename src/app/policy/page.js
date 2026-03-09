const POLICY_SECTIONS = [
	{
		title: "1. Information We Collect",
		items: [
			"Personal information you provide: name, business name, email, phone number, and billing details required to process payments.",
			"Automatically collected information: IP address, browser type, device type, and website usage analytics.",
			"Payment information is processed through Stripe for authorized card and account billing.",
		],
	},
	{
		title: "2. How We Use Your Information",
		items: [
			"To create and manage your rental account, invoices, and recurring billing.",
			"To verify account ownership and reduce fraud risk.",
			"To communicate about account activity, billing events, and support requests.",
			"To meet legal, regulatory, and tax obligations.",
		],
	},
	{
		title: "3. Data Sharing and Disclosure",
		items: [
			"We do not sell your personal information.",
			"We share data only with operational providers required to deliver services, including Stripe and related infrastructure vendors.",
			"We may disclose information when required by law or to protect our rights and systems.",
		],
	},
	{
		title: "4. Data Security",
		body: "We maintain administrative, technical, and physical safeguards, including secure transmission controls and restricted access to operational systems.",
	},
	{
		title: "5. Retention of Data",
		body: "We retain data only as long as necessary for operations, legal compliance, dispute resolution, and business continuity.",
	},
	{
		title: "6. Your Rights",
		body: "Depending on your location, you may request access, correction, restriction, or deletion of your personal data by contacting support@d1trailers.com.",
	},
	{
		title: "7. Changes to this Policy",
		body: "Policy updates are published on this page with an updated effective date. Continued use after changes means acceptance of the updated terms.",
	},
	{
		title: "8. Contact",
		body: "Questions can be sent to support@d1trailers.com. Mailing address: 106 N. Denton Tap Rd. #210-117, Coppell, TX 75019.",
	},
];

export default function Policy() {
	return (
		<div className="grid grid-flow-row w-full h-full gap-8 mt-25 p-5 md:px-15 lg:px-25 pb-12">
			<header className="surface-panel motion-enter rounded-2xl p-6 md:p-8 space-y-4">
				<h1 className="font-syne text-3xl md:text-5xl lg:text-6xl font-bold">
					Privacy Policy
				</h1>
				<p className="inline-flex rounded-full border border-(--border-soft) bg-neutral-100 dark:bg-neutral-800 px-4 py-1 text-xs uppercase tracking-[0.12em] text-neutral-700 dark:text-neutral-300">
					Updated November 2025
				</p>
				<p className="max-w-4xl text-neutral-700 dark:text-neutral-300 leading-relaxed">
					D1 Trailers, LLC is committed to protecting customer and visitor
					privacy. This page explains what we collect, how we use it, and how we
					secure operational and billing data.
				</p>
			</header>

			<div className="grid grid-cols-1 gap-4">
				{POLICY_SECTIONS.map((section) => (
					<article
						key={section.title}
						className="surface-panel motion-enter rounded-2xl p-5 md:p-6"
					>
						<h2 className="font-syne text-xl md:text-2xl font-bold mb-3">
							{section.title}
						</h2>
						{Array.isArray(section.items) ? (
							<ul className="list-disc pl-5 space-y-2 text-neutral-700 dark:text-neutral-300 leading-relaxed">
								{section.items.map((item) => (
									<li key={`${section.title}-${item}`}>{item}</li>
								))}
							</ul>
						) : (
							<p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
								{section.body}
							</p>
						)}
					</article>
				))}
			</div>
		</div>
	);
}
