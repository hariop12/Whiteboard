"use client"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/contexts/theme-context"
import { useAuth } from "@/contexts/auth-context"
import { WhiteboardList } from "@/components/whiteboard-list"
import { Moon, Sun, User, LogOut } from "lucide-react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { user, isLoading } = useAuth()

  const handleSignOut = async () => {
    toast({
      title: "Signing out",
      description: "You will be redirected to the login page",
    })

    await signOut({ callbackUrl: "/" })
  }

  return (
    <header
      className={`flex items-center justify-between p-4 border-b ${theme === "dark" ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white"}`}
    >
      <div className="flex items-center">
        <h1 className="text-xl font-bold mr-4">Whiteboard App</h1>
        {user && <WhiteboardList />}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="transition-all hover:scale-110"
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </Button>

        {isLoading ? (
          <Button variant="ghost" size="icon" disabled>
            <User size={20} />
          </Button>
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="transition-all hover:scale-110">
                <User size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>Signed in as {user.name}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-500 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link href="/login">
            <Button variant="outline" size="sm" className="transition-all hover:scale-105">
              Sign in
            </Button>
          </Link>
        )}
      </div>
    </header>
  )
}
