import type { Metadata, Viewport } from 'next'
import { Inter, Lexend } from 'next/font/google'
import 'katex/dist/katex.min.css'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import SiteChrome from '@/components/SiteChrome'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap', weight: ['500', '600', '700', '800'] })

export const metadata: Metadata = {
  title: 'JEE PYQ Hub — Practice Previous Year Questions',
  description:
    'Practice JEE Main & Advanced previous year questions chapter-wise across Physics, Chemistry and Mathematics. Track difficulty, bookmark questions, and take timed tests.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1652f0',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${lexend.variable}`}>
      <body>
        <AuthProvider>
          <SiteChrome>{children}</SiteChrome>
        </AuthProvider>
      </body>
    </html>
  )
}
