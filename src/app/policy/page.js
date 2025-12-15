export default function Policy() {
  return (
    <div className="grid grid-flow-row w-full h-full gap-7 mt-25 p-5 md:px-35 lg:px-65">
      <div className="flex flex-col gap-4">
        <h2 className="font-syne text-3xl md:text-5xl lg:text-7xl font-bold">
          Privacy Policy
        </h2>
        <p className="text-neutral-600 px-3 py-0.5 rounded-full bg-neutral-400 border-2 border-neutral-500 w-fit">
          Updated November 2025
        </p>
        <p className="text-balance">
          D1 Trailers, LLC (“we,” “us,” “our”) is committed to protecting the
          privacy of our customers and website visitors. This Privacy Policy
          describes how we collect, use, disclose, and secure personal
          information when you use our services, including monthly trailer
          rental payments and online checkout.
        </p>
      </div>
      <ListPolicySection title={"1. Information We Collect"}>
        <li>
          Personal information you provide: Name, business name, email address,
          phone number, bank account or card details (for billing and recurring
          payments).
        </li>
        <li>
          Automatically collected information: IP address, device type, browser
          type, usage data from our website.
        </li>
        <li>
          Payment related information: When you authorize ACH or card payments,
          we collect and process your bank or card account credentials via our
          payment processor (Stripe).
        </li>
      </ListPolicySection>
      <ListPolicySection title={"2. How We Use Your Information"}>
        <li>
          To set up and manage your rental account, process monthly payments,
          send invoices and receipts.
        </li>

        <li>
          To verify the bank or card account you provide and to prevent fraud.
        </li>

        <li>
          To communicate with you about your rental account, payment issues, or
          support requests.
        </li>

        <li>To comply with legal, regulatory, and tax obligations.</li>
      </ListPolicySection>
      <ListPolicySection title={"3. Data Sharing and Disclosure"}>
        <li>We do not sell your personal information to third-parties.</li>

        <li>
          We share information with our payment processor (Stripe) and other
          service providers necessary to operate our business. These service
          providers are required to protect your data and use it only to perform
          services for us.
        </li>

        <li>
          We may disclose information when required by law or to protect our
          rights.
        </li>
      </ListPolicySection>
      <PolicySection title={"4. Data Security"}>
        <p>
          We maintain administrative, technical, and physical safeguards
          designed to protect your personal information. These measures include
          encryption during transmission, secure access controls, and ongoing
          monitoring. Although no system is completely secure, we strive to
          protect your information.
        </p>
      </PolicySection>
      <PolicySection title={"5. Retention of Data"}>
        <p>
          We retain your personal information for as long as necessary to
          fulfill the purposes described in this Privacy Policy and to comply
          with legal obligations, resolve disputes, enforce agreements, and for
          business continuity.
        </p>
      </PolicySection>
      <PolicySection title={"6. Your Rights"}>
        Depending on your jurisdiction, you may have rights to access, correct,
        restrict processing, or delete your personal data. To make such a
        request, please contact us at support@d1trailers.com.
      </PolicySection>
      <PolicySection title={"7. Changes to this Policy"}>
        We may update this Privacy Policy from time to time. We will indicate
        the date of the latest update at the top of this page. Your continued
        use of our services after the changes become effective constitutes your
        acceptance of the revised policy.
      </PolicySection>
      <PolicySection title={"8. Contact Us"}>
        If you have questions or concerns about this Privacy Policy or our
        privacy practices, please contact us at: Email: support@d1trailers.com
        Mailing Address: 106 N. Denton Tap Rd. #210-117, Coppell, TX 75019
      </PolicySection>
    </div>
  );
}

function ListPolicySection({ title, children }) {
  return (
    <PolicySection title={title}>
      <ul className="pl-4 list-disc flex flex-col gap-3 lg:w-3/5">
        {children}
      </ul>
    </PolicySection>
  );
}

function PolicySection({ title, children }) {
  return (
    <div className="flex flex-col gap-4 pl-5">
      <h3 className="font-syne font-bold">{title}</h3>
      {children}
    </div>
  );
}
