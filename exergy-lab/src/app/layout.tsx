import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Exergy Lab | Energy Intelligence Platform',
  description:
    'Real-time thermodynamic tracking and analysis of global energy flows. TEA calculations, exergy analysis, and AI-powered energy research.',
  keywords: [
    'exergy',
    'energy analysis',
    'TEA calculator',
    'thermodynamics',
    'renewable energy',
    'clean energy',
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body
          className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
