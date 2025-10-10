import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Privacy Policy
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <Card padding="lg" className="prose dark:prose-invert max-w-none">
          <div className="space-y-6 text-slate-700 dark:text-slate-300">
            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                1. Introduction
              </h2>
              <p>
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Purchase Order Management System ("Service"). Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                2. Information We Collect
              </h2>
              <p>
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Account Information:</strong> Name, email address, password, and organization details</li>
                <li><strong>Purchase Order Data:</strong> Supplier information, line items, amounts, tax details, and related documents</li>
                <li><strong>Usage Information:</strong> Log data, IP addresses, browser type, and device information</li>
                <li><strong>Communication Data:</strong> Emails, support requests, and feedback you provide</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                3. How We Use Your Information
              </h2>
              <p>
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Provide, maintain, and improve the Service</li>
                <li>Process and manage purchase orders</li>
                <li>Send purchase orders and related communications to suppliers</li>
                <li>Authenticate users and maintain account security</li>
                <li>Respond to your inquiries and provide customer support</li>
                <li>Monitor and analyze usage patterns and trends</li>
                <li>Detect, prevent, and address technical issues and security threats</li>
                <li>Comply with legal obligations and enforce our terms</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                4. Information Sharing and Disclosure
              </h2>
              <p>
                We do not sell your personal information. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>With Your Consent:</strong> When you authorize us to share information</li>
                <li><strong>Service Providers:</strong> Third-party vendors who perform services on our behalf (hosting, email delivery, analytics)</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong>Legal Requirements:</strong> To comply with legal obligations or respond to lawful requests</li>
                <li><strong>FreeAgent Integration:</strong> When you connect your FreeAgent account, we share necessary data for synchronization</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                5. Data Security
              </h2>
              <p>
                We implement appropriate technical and organizational measures to protect your information, including:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and monitoring</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Secure cloud infrastructure (Supabase)</li>
              </ul>
              <p className="mt-2">
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                6. Data Retention
              </h2>
              <p>
                We retain your information for as long as your account is active or as needed to provide the Service. We will retain and use your information as necessary to comply with legal obligations, resolve disputes, and enforce our agreements. Password reset tokens expire after 1 hour and invoice upload tokens expire after 90 days.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                7. Your Rights
              </h2>
              <p>
                Depending on your location, you may have the following rights regarding your personal information:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Receive your data in a structured, commonly used format</li>
                <li><strong>Objection:</strong> Object to certain processing of your information</li>
                <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
              </ul>
              <p className="mt-2">
                To exercise these rights, please contact your organization administrator.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                8. Cookies and Tracking Technologies
              </h2>
              <p>
                We use cookies and similar tracking technologies to track activity on the Service and hold certain information. Cookies are files with a small amount of data which may include an anonymous unique identifier. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                9. Third-Party Services
              </h2>
              <p>
                The Service integrates with third-party services, including:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Supabase:</strong> Database and authentication hosting</li>
                <li><strong>FreeAgent:</strong> Accounting software integration</li>
                <li><strong>Resend:</strong> Email delivery service</li>
                <li><strong>Sentry:</strong> Error tracking and monitoring</li>
                <li><strong>Upstash:</strong> Rate limiting infrastructure</li>
              </ul>
              <p className="mt-2">
                These third-party services have their own privacy policies. We encourage you to review their privacy practices.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                10. International Data Transfers
              </h2>
              <p>
                Your information may be transferred to and maintained on computers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ. By using the Service, you consent to such transfers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                11. Children's Privacy
              </h2>
              <p>
                The Service is not intended for use by children under the age of 16. We do not knowingly collect personal information from children under 16. If you become aware that a child has provided us with personal information, please contact us.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                12. Changes to This Privacy Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last updated" date at the top of this Privacy Policy. We encourage you to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                13. Contact Us
              </h2>
              <p>
                If you have questions or concerns about this Privacy Policy or our data practices, please contact your organization administrator.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                14. GDPR Compliance
              </h2>
              <p>
                If you are located in the European Economic Area (EEA), you have certain data protection rights under the General Data Protection Regulation (GDPR). We act as a data processor for your organization, which is the data controller. Your organization is responsible for ensuring GDPR compliance for your data.
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
