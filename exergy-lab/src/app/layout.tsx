import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from '@/lib/theme-provider'
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
  title: 'Exergy Lab | AI-Powered Scientific Research Platform',
  description:
    'Accelerating discovery in energy, materials, and chemicals. AI-powered research tools including TEA calculations, exergy analysis, physics simulations, and multi-source literature search.',
  keywords: [
    'exergy',
    'energy analysis',
    'TEA calculator',
    'thermodynamics',
    'renewable energy',
    'materials science',
    'battery materials',
    'membrane separation',
    'scientific research',
    'AI research',
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Check if Clerk is configured with valid keys
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const hasValidClerkKey = clerkPublishableKey && !clerkPublishableKey.includes('your_key_here')

  const content = (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )

  // Only use ClerkProvider if valid keys are configured
  return hasValidClerkKey ? (
    <ClerkProvider>{content}</ClerkProvider>
  ) : (
    content
  )
}
