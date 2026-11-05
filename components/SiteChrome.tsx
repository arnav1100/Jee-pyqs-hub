'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import AnnouncementBanner from './AnnouncementBanner'
import MobileBottomNav from './MobileBottomNav'
import GlobalBackButton from './GlobalBackButton'
import { QuestionLibraryProvider } from '@/lib/question-library'
import { ExamCatalogProvider } from '@/lib/exam-catalog'
import { StudyDataProvider } from '@/lib/study-data'

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'
  const isAdminRoute = pathname.startsWith('/admin')

  if (isAdminRoute) {
    return <ExamCatalogProvider><GlobalBackButton />{children}</ExamCatalogProvider>
  }

  return (
    <QuestionLibraryProvider>
      <ExamCatalogProvider>
        <StudyDataProvider>
          <AnnouncementBanner />
          <Navbar />
          <GlobalBackButton />
          <main className="min-h-[calc(100dvh-56px)]">{children}</main>
          <MobileBottomNav />
        </StudyDataProvider>
      </ExamCatalogProvider>
    </QuestionLibraryProvider>
  )
}
