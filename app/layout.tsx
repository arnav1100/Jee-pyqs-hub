import type { Metadata, Viewport } from 'next'
import { Inter, Lexend } from 'next/font/google'
import 'katex/dist/katex.min.css'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import SiteChrome from '@/components/SiteChrome'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap', weight: ['500', '600', '700', '800'] })

export const metadata: Metadata = {
  title: 'JEE PYQ HUB — Smart JEE Main Practice',
  description:
    'Practice JEE Main previous year questions chapter-wise across Physics, Chemistry and Mathematics. Filter by year and shift, track performance, and build timed tests.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Never let the browser zoom out below the device width (which used to
  // reveal a shrunken, shifted copy of the whole site on phones), but keep
  // pinch-zoom available for accessibility.
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#108b77',
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
