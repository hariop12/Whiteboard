"use client"

import type React from "react"

import { ThemeProvider } from "@/contexts/theme-context"
import { WhiteboardProvider } from "@/contexts/whiteboard-context"
import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "@/components/ui/toaster"
import { SessionProvider } from "next-auth/react"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProvider>
        <ThemeProvider>
          <WhiteboardProvider>
            {children}
            <Toaster />
          </WhiteboardProvider>
        </ThemeProvider>
      </AuthProvider>
    </SessionProvider>
  )
}
