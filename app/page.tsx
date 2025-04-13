"use client"

import { WhiteboardCanvas } from "@/components/whiteboard-canvas"
import { Toolbar } from "@/components/toolbar"
import { Header } from "@/components/header"
import { useTheme } from "@/contexts/theme-context"

export default function Home() {
  const { theme } = useTheme()

  return (
    <div className={`flex flex-col h-screen ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-black"}`}>
      <Header />
      <Toolbar />
      <main className="flex-1 overflow-hidden">
        <WhiteboardCanvas />
      </main>
    </div>
  )
}
