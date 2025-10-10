import { getUser } from '@/lib/auth-helpers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export default async function Home() {
  const user = await getUser()

  // Redirect to dashboard if already authenticated
  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="z-10 max-w-3xl w-full">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-4 text-slate-900 dark:text-white">
            HelixFlow
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
            Streamline your purchase order management with FreeAgent integration
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signin">
              <Button variant="primary" size="md" className="px-8 py-3">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="secondary" size="md" className="px-8 py-3">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
