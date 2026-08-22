'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import AnnouncementBanner from './AnnouncementBanner'

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/admin')

  if (isAdminRoute) {
    return <>{children}</>
  }

  return (
    <>
      <AnnouncementBanner />
      <Navbar />
      <main className="min-h-[calc(100dvh-56px)]">{children}</main>
    </>
  )
}
