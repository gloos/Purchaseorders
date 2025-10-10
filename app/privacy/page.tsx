import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            HelixFlow — Privacy Policy
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Last updated: 10 October 2025
          </p>
        </div>

        <Card padding="lg" className="prose dark:prose-invert max-w-none">
          <div className="space-y-6 text-slate-700 dark:text-slate-300">
            <p>
              This Privacy Policy explains how Thames Translation Group Ltd ("HelixFlow", "we", "us", "our", company no. 9668305) processes personal data in connection with the HelixFlow purchase-order (PO) management platform, websites, apps and related services (the "Service"). Our registered office is 86–90 Paul Street, London EC2A 4NE. Contact: gluce@thamestranslation.com
            </p>
            <p className="mt-2">
              We are committed to protecting privacy and complying with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
            </p>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                1. Who is the controller?
              </h2>
              <p>
                For most content you and your users upload or generate in the Service (e.g., PO data, attachments, contact records synced from your systems), you (your organisation) are the controller and we act as your processor.
              </p>
              <p className="mt-2">
                For account administration, authentication metadata, usage logs, communications, billing, website operations, and our marketing (if any), we are the controller.
              </p>
              <p className="mt-2">
                A separate Data Processing Agreement (DPA) is available for controller–processor matters. Where we act as processor, we only process personal data on your documented instructions and under the DPA.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                2. The data we process
              </h2>
              <p><strong>A. Account & Organisation Data (controller: us)</strong></p>
              <p className="mt-2">
                Account identifiers (name, email), organisation/tenant membership, roles/permissions, auth metadata, activity and security logs.
              </p>
              <p className="mt-2">
                Support communications and preferences.
              </p>

              <p className="mt-4"><strong>B. Customer Data in the Service (controller: you; processor: us)</strong></p>
              <p className="mt-2">
                PO records, approvals, comments, line items, supplier details you provide.
              </p>
              <p className="mt-2">
                Supplier uploads: files submitted via tokenised links (e.g., invoices). We apply file type/size limits and token expiry as a security measure.
              </p>
              <p className="mt-2">
                Integrations (e.g., FreeAgent): data you authorise us to read/write (e.g., contacts, bills).
              </p>

              <p className="mt-4"><strong>C. Technical Data (controller: us)</strong></p>
              <p className="mt-2">
                Device/IP, timestamps, pages and API routes accessed, event/error logs (e.g., via Sentry), rate-limit counters.
              </p>

              <p className="mt-4"><strong>D. Communications & Marketing (controller: us)</strong></p>
              <p className="mt-2">
                Emails we send (e.g., operational notices, security alerts). Optional marketing, if you opt in.
              </p>

              <p className="mt-4">
                <strong>Special category data:</strong> We do not seek or require special category data. Please do not upload such data to the Service unless you have a lawful basis and appropriate safeguards.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                3. How we obtain data
              </h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Directly from you when you create an account, configure tenants, invite users, and use features.</li>
                <li>From your suppliers via tokenised upload links you distribute.</li>
                <li>From third-party services you connect (e.g., FreeAgent OAuth).</li>
                <li>Automatically via our systems (logs, security telemetry).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                4. Purposes and legal bases (UK GDPR)
              </h2>
              <p>Where we are controller, we rely on:</p>
              <p className="mt-2">
                <strong>Contract (Art. 6(1)(b)):</strong> to register accounts, provide and support the Service.
              </p>
              <p className="mt-2">
                <strong>Legitimate interests (Art. 6(1)(f)):</strong> to secure, maintain, and improve the Service; prevent abuse; measure usage; handle queries. We balance these interests against your rights.
              </p>
              <p className="mt-2">
                <strong>Legal obligation (Art. 6(1)(c)):</strong> to comply with law and regulatory requests.
              </p>
              <p className="mt-2">
                <strong>Consent (Art. 6(1)(a)):</strong> for optional marketing or non-essential cookies/trackers (if used).
              </p>
              <p className="mt-2">
                Where we are processor, we process Customer Data solely on your instructions and for your purposes in providing the Service (Art. 28).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                5. How we share data
              </h2>
              <p>
                We use reputable service providers (sub-processors) to run the Service, for example:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Supabase (database, auth, storage),</li>
                <li>Resend (transactional email),</li>
                <li>Sentry (error monitoring),</li>
                <li>Upstash (rate-limiting infrastructure).</li>
              </ul>
              <p className="mt-2">
                When you connect FreeAgent, we process data between HelixFlow and FreeAgent under your instructions.
              </p>
              <p className="mt-4">
                We disclose data only:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>to our sub-processors under data protection terms,</li>
                <li>to comply with law or lawful requests,</li>
                <li>to a buyer or successor in the event of corporate change (with appropriate safeguards).</li>
              </ul>
              <p className="mt-4">
                We do not sell personal data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                6. International transfers
              </h2>
              <p>
                Personal data may be processed or stored in the UK, EEA, or other countries where our providers operate. Where data leaves the UK/EEA, we rely on lawful transfer mechanisms (e.g., UK Addendum to the EU Standard Contractual Clauses or adequacy regulations) and require appropriate safeguards from recipients.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                7. Security
              </h2>
              <p>
                We maintain appropriate technical and organisational measures, including role-based access, tokenised supplier uploads with time-limited links, file validation, encryption in transit, environment segregation, monitoring and alerting (e.g., via Sentry), and rate-limiting to protect endpoints. No system is perfectly secure; you remain responsible for user access management and the recipients of any supplier-upload links you distribute.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                8. Data retention
              </h2>
              <p>
                <strong>Account & organisation data (controller: us):</strong> kept for the life of the account and then for a limited period to close out records, enforce rights, and meet legal/accounting duties.
              </p>
              <p className="mt-2">
                <strong>Customer Data (processor):</strong> retained while your organisation uses the Service. On termination, we delete or return Customer Data within a reasonable period, subject to legal retention needs and backup cycles.
              </p>
              <p className="mt-2">
                <strong>Logs & telemetry:</strong> retained for a limited period needed for security, operations, and troubleshooting.
              </p>
              <p className="mt-2">
                Actual periods may vary depending on legal, security, and operational requirements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                9. Your rights (where we are controller)
              </h2>
              <p>
                You may have rights under the UK GDPR, including:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Access to your personal data,</li>
                <li>Rectification of inaccurate data,</li>
                <li>Erasure (where applicable),</li>
                <li>Restriction or Objection to processing (particularly where based on legitimate interests),</li>
                <li>Portability (where applicable),</li>
                <li>Withdraw consent (for any processing based on consent).</li>
              </ul>
              <p className="mt-4">
                To exercise rights or raise questions, contact gluce@thamestranslation.com
              </p>
              <p className="mt-2">
                For Customer Data where we act as processor, please contact your organisation (the controller). We will assist them in responding to your request.
              </p>
              <p className="mt-2">
                You have the right to lodge a complaint with the UK Information Commissioner's Office (ICO). See ico.org.uk for details.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                10. Cookies and similar technologies
              </h2>
              <p>
                We use essential cookies/technologies necessary to operate and secure the Service (e.g., session/auth). If we use non-essential analytics or marketing cookies, we will seek your consent and provide controls.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                11. Children
              </h2>
              <p>
                The Service is intended for business use and is not directed to children. Please do not allow children to use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                12. Third-party links and services
              </h2>
              <p>
                The Service may link to third-party services (e.g., FreeAgent). Their processing is governed by their own privacy policies. We are not responsible for third-party practices.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                13. Changes to this policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. If changes are material, we will notify you in the Service or by email. Continued use after the effective date constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                14. Contact
              </h2>
              <p>
                <strong>Controller (for the processing we control):</strong>
              </p>
              <p className="mt-2">
                Thames Translation Group Ltd<br />
                86–90 Paul Street, London EC2A 4NE<br />
                Email: gluce@thamestranslation.com
              </p>
              <p className="mt-4">
                For controller–processor matters (where we process on your organisation's instructions), see your organisation's privacy information and our DPA.
              </p>
            </section>
          </div>
        </Card>

        <div className="mt-8 flex justify-center">
          <Link href="/">
            <Button variant="primary" size="md">
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
