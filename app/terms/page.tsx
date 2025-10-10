import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            HelixFlow — Terms of Service (UK, B2B)
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Last updated: 10 October 2025
          </p>
        </div>

        <Card padding="lg" className="prose dark:prose-invert max-w-none">
          <div className="space-y-6 text-slate-700 dark:text-slate-300">
            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                1. Who we are
              </h2>
              <p>
                These Terms of Service ("Terms") govern access to and use of the HelixFlow purchase-order management platform and related websites, apps, and APIs (the "Service") provided by Thames Translation Group Ltd, a company registered in England and Wales (company no. 9668305) with registered office at 86–90 Paul Street, London EC2A 4NE ("we", "us", "our").
              </p>
              <p className="mt-2">
                These Terms form a binding contract between us and the organisation that creates an account ("Customer", "you"). The Service is intended exclusively for business use and not for consumers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                2. Account, organisations and roles
              </h2>
              <p><strong>2.1 Accounts & organisations.</strong> Users sign in and belong to an organisation (tenant). Admins can invite users and manage roles/permissions.</p>
              <p className="mt-2"><strong>2.2 Roles.</strong> Roles may include Super Admin, Admin, Manager and Viewer, with differing rights (e.g., approval authority). You are responsible for designating appropriate roles.</p>
              <p className="mt-2"><strong>2.3 Your responsibilities.</strong> You must (a) keep login credentials secure; (b) ensure your users comply with these Terms; (c) provide accurate information; and (d) maintain necessary rights to upload and process data via the Service.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                3. The Service and key features
              </h2>
              <p><strong>3.1 PO management & approvals.</strong> Create POs, route for approval (including threshold-based approvals), track status, and maintain audit trails. Approved POs may be emailed to suppliers.</p>
              <p className="mt-2"><strong>3.2 Supplier invoice upload.</strong> Suppliers can upload invoice files via secure tokenised links. We enforce file-type and size limits and token expiry for security. Currently accepted: PDF/PNG/JPG, max 10 MB; token links typically expire ~90 days after issuance (limits and formats may change over time).</p>
              <p className="mt-2"><strong>3.3 FreeAgent integration.</strong> You may connect a FreeAgent account using OAuth to sync contacts and create bills from invoiced POs. You authorise us to access and process data as necessary to provide these features.</p>
              <p className="mt-2"><strong>3.4 Emails & PDFs.</strong> The Service can email POs and notifications (e.g., approval events) and generate PDF outputs.</p>
              <p className="mt-2"><strong>3.5 Analytics.</strong> Dashboards may show PO metrics and activity for your organisation.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                4. Third-party services and rate-limiting
              </h2>
              <p><strong>4.1 Sub-processors.</strong> We use reputable providers to deliver the Service, including (for example) Supabase (database/auth/storage), Resend (email), Sentry (error monitoring), and Upstash (rate-limiting), and we integrate with FreeAgent as directed by you. Each has its own terms and privacy practices.</p>
              <p className="mt-2"><strong>4.2 Rate-limiting & fair use.</strong> We may rate-limit certain endpoints (e.g., public upload or OAuth initiation) to protect the Service. You agree not to circumvent limits or overload the Service.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                5. Acceptable use
              </h2>
              <p>
                You must not: (a) use the Service unlawfully or for unlawful content; (b) infringe third-party rights; (c) introduce malware or circumvent security; (d) attempt unauthorised access; (e) resell or provide the Service to third parties except to your permitted users; or (f) interfere with Service operation.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                6. Customer Data; our licence
              </h2>
              <p><strong>6.1 Ownership.</strong> You retain all rights to data you or your users input or upload, including PO information, attachments, contacts, and configuration ("Customer Data").</p>
              <p className="mt-2"><strong>6.2 Our limited licence.</strong> You grant us a non-exclusive, worldwide, royalty-free licence to host, copy, process, transmit and display Customer Data only to provide and support the Service, to maintain security and integrity, and to comply with law.</p>
              <p className="mt-2"><strong>6.3 Your warranties.</strong> You warrant that you have all rights and consents necessary to submit Customer Data and that its use in the Service won't violate law or rights of others.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                7. Privacy and data protection
              </h2>
              <p><strong>7.1 Privacy Policy.</strong> Our Privacy Policy explains how we collect and process personal data in connection with the Service and is incorporated by reference.</p>
              <p className="mt-2"><strong>7.2 Controller/processor.</strong> For most Customer Data, we act as a processor to you (the controller). We may act as a controller for limited account/operational data (e.g., auth metadata, logs).</p>
              <p className="mt-2"><strong>7.3 International transfers.</strong> You acknowledge data may be processed or stored outside the UK/EEA by our sub-processors with appropriate safeguards.</p>
              <p className="mt-2"><strong>7.4 DPA.</strong> If required, we can enter into a separate Data Processing Agreement (including UK/EU transfer addenda) which will prevail over this section in case of conflict.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                8. Security; your obligations
              </h2>
              <p><strong>8.1 Our measures.</strong> We maintain administrative, technical and organisational measures appropriate to the risk (including role-based access, tokenised supplier uploads, file validation, and monitoring). While we strive for security, no system is completely secure.</p>
              <p className="mt-2"><strong>8.2 Your measures.</strong> You must secure your accounts, manage user roles, and promptly remove access for leavers. For supplier uploads, you are responsible for distributing links to the correct recipients and for reviewing uploaded documents.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                9. Service changes; availability
              </h2>
              <p><strong>9.1</strong> We may update or modify features, interfaces, and integrations (including FreeAgent scopes) without materially reducing core functionality.</p>
              <p className="mt-2"><strong>9.2</strong> The Service is provided on an "as is" and "as available" basis without uptime guarantees unless we agree an SLA in writing. Planned maintenance and third-party outages may affect availability.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                10. Trials, beta features, and feedback
              </h2>
              <p><strong>10.1 Trials/Beta.</strong> Trial or beta features may be offered with reduced or changing functionality and may be withdrawn at any time. Use is at your own risk.</p>
              <p className="mt-2"><strong>10.2 Feedback.</strong> You grant us a perpetual, worldwide, royalty-free licence to use feedback you submit to improve the Service. We will not publicly identify you without consent.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                11. Fees and taxes
              </h2>
              <p>
                If/when fees apply, they will be set out in an order form or online plan (excluding VAT unless stated). You authorise recurring charges where applicable. Fees are non-refundable except as required by law. We may suspend or terminate for non-payment after notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                12. Term and termination
              </h2>
              <p><strong>12.1 Term.</strong> These Terms start when you first access the Service and continue until terminated.</p>
              <p className="mt-2"><strong>12.2 Termination for convenience.</strong> Either party may terminate at any time by giving notice (admins can cancel in-product, where available).</p>
              <p className="mt-2"><strong>12.3 Termination for cause.</strong> Either party may terminate immediately for material breach not cured within 14 days (or immediately for illegal use or serious security risk).</p>
              <p className="mt-2"><strong>12.4 Effect.</strong> Upon termination, access ends. We will delete or return Customer Data within a reasonable period, subject to legal retention and backup schedules.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                13. Warranties and disclaimers
              </h2>
              <p>
                Except as expressly stated, we disclaim all warranties (express, implied, statutory), including merchantability, fitness for a particular purpose, and non-infringement. We do not warrant error-free or uninterrupted operation, or that the Service will meet your requirements, or that third-party services (e.g., FreeAgent, email delivery) will be available.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                14. Limitation of liability
              </h2>
              <p><strong>14.1 No indirect damages.</strong> We are not liable for indirect, special, incidental, consequential, or punitive damages, loss of profits, revenue, goodwill, data, or business interruption.</p>
              <p className="mt-2"><strong>14.2 Cap.</strong> Our aggregate liability arising out of or related to the Service is limited to the greater of £1,000 or the fees paid by you to us in the 12 months before the first event giving rise to liability.</p>
              <p className="mt-2"><strong>14.3 Carve-outs.</strong> Nothing excludes liability for death or personal injury caused by negligence, fraud/fraudulent misrepresentation, or any other liability that cannot be excluded under English law.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                15. Indemnity
              </h2>
              <p>
                You will defend and indemnify us from claims arising from (a) Customer Data; (b) your misuse of the Service; or (c) your violation of law or third-party rights, including IP or data protection violations.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                16. Confidentiality
              </h2>
              <p>
                Each party will protect the other's confidential information with the same care it uses for its own and will use it only to perform under these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                17. Notices; updates to Terms
              </h2>
              <p>
                We may update these Terms from time to time. Material changes will be notified in-app or by email. Continued use after the effective date constitutes acceptance.
              </p>
              <p className="mt-2">
                <strong>Notices to us:</strong> gluce@thamestranslation.com
              </p>
              <p className="mt-2">
                <strong>Registered office:</strong> Thames Translation Group Ltd, 86–90 Paul Street, London EC2A 4NE
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                18. General
              </h2>
              <p><strong>18.1 Assignment.</strong> You may not assign these Terms without our consent; we may assign in connection with a merger, sale, or reorganisation.</p>
              <p className="mt-2"><strong>18.2 Entire agreement.</strong> These Terms (and any DPA/SLA or order form) are the entire agreement.</p>
              <p className="mt-2"><strong>18.3 Severability & waiver.</strong> If a clause is unenforceable, the rest remains in effect; failure to enforce is not a waiver.</p>
              <p className="mt-2"><strong>18.4 Governing law & jurisdiction.</strong> These Terms are governed by the laws of England and Wales and the parties submit to the exclusive jurisdiction of the courts of England and Wales.</p>
              <p className="mt-2"><strong>18.5 Third-party rights.</strong> No person other than the parties has rights under the Contracts (Rights of Third Parties) Act 1999.</p>
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
