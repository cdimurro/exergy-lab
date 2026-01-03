/**
 * Sign Up Page
 *
 * Uses Clerk's SignUp component with custom styling.
 */

import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <SignUp
      appearance={{
        elements: {
          formButtonPrimary:
            'bg-primary hover:bg-primary/90 text-primary-foreground',
          card: 'bg-transparent shadow-none',
          headerTitle: 'text-foreground',
          headerSubtitle: 'text-muted',
          socialButtonsBlockButton:
            'bg-background border border-border hover:bg-background-hover text-foreground',
          formFieldLabel: 'text-foreground',
          formFieldInput:
            'bg-background border-border text-foreground placeholder:text-muted',
          footerActionLink: 'text-primary hover:text-primary/80',
          identityPreviewEditButton: 'text-primary',
          formFieldAction: 'text-primary',
          dividerLine: 'bg-border',
          dividerText: 'text-muted',
        },
        variables: {
          colorPrimary: '#3b82f6',
          colorBackground: 'transparent',
          colorText: '#f8fafc',
          colorTextSecondary: '#94a3b8',
          colorInputBackground: '#0f172a',
          colorInputText: '#f8fafc',
        },
      }}
      routing="path"
      path="/sign-up"
      signInUrl="/sign-in"
      fallbackRedirectUrl="/"
    />
  )
}
