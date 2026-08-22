import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-bold text-ink-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">This subject or chapter doesn't exist yet.</p>
      <Link href="/" className="mt-5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">
        Back to home
      </Link>
    </div>
  )
}
