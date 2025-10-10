import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Terms of Service
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <Card padding="lg" className="prose dark:prose-invert max-w-none">
          <div className="space-y-6 text-slate-700 dark:text-slate-300">
            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing and using this Purchase Order Management System ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                2. Description of Service
              </h2>
              <p>
                The Service provides a web-based platform for creating, managing, and tracking purchase orders, including integration with FreeAgent accounting software. The Service may be modified, updated, or discontinued at any time without prior notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                3. User Accounts
              </h2>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and promptly update your account information</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Use strong passwords and keep them secure</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                4. Acceptable Use
              </h2>
              <p>
                You agree not to use the Service to:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon the rights of others</li>
                <li>Transmit malicious code or attempt to gain unauthorized access</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Collect or harvest information about other users</li>
                <li>Use the Service for any fraudulent or illegal purpose</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                5. Data and Privacy
              </h2>
              <p>
                Your use of the Service is also governed by our Privacy Policy. We collect and process personal data in accordance with applicable data protection laws. You retain ownership of all data you submit to the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                6. Intellectual Property
              </h2>
              <p>
                The Service and its original content, features, and functionality are owned by the Service provider and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                7. Third-Party Services
              </h2>
              <p>
                The Service may integrate with third-party services such as FreeAgent. Your use of such third-party services is subject to their respective terms of service and privacy policies. We are not responsible for the practices of third-party services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                8. Limitation of Liability
              </h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES RESULTING FROM YOUR USE OF THE SERVICE.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                9. Termination
              </h2>
              <p>
                We reserve the right to suspend or terminate your access to the Service at any time, with or without cause, with or without notice. Upon termination, your right to use the Service will immediately cease.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                10. Changes to Terms
              </h2>
              <p>
                We reserve the right to modify these Terms of Service at any time. We will provide notice of material changes by updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                11. Governing Law
              </h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of England and Wales, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
                12. Contact Information
              </h2>
              <p>
                If you have any questions about these Terms of Service, please contact your organization administrator.
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
