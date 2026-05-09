'use client'

import { type ReactNode } from 'react'
import { QueryProvider } from './query-provider'
import { ThemeProvider } from './theme-provider'
import { Toaster } from '@/components/ui/sonner'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster richColors closeButton />
      </ThemeProvider>
    </QueryProvider>
  )
}
