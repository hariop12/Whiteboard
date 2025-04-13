"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useWhiteboard } from "@/contexts/whiteboard-context"
import { Button } from "@/components/ui/button"
import type { Whiteboard } from "@/types"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Trash2, Loader2 } from "lucide-react"

export function WhiteboardList() {
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingWhiteboard, setIsLoadingWhiteboard] = useState(false)
  const [loadingWhiteboardId, setLoadingWhiteboardId] = useState<string | null>(null)
  const [deletingWhiteboardId, setDeletingWhiteboardId] = useState<string | null>(null)
  const { setCurrentWhiteboard, setElements } = useWhiteboard()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  const fetchWhiteboards = async () => {
    if (!user) {
      setWhiteboards([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch("/api/whiteboards")

      if (!response.ok) {
        throw new Error("Failed to fetch whiteboards")
      }

      const data = await response.json()

      // Ensure each whiteboard has an id property
      const formattedWhiteboards = data.map((wb: any) => ({
        ...wb,
        id: wb._id || wb.id,
      }))

      setWhiteboards(formattedWhiteboards)
    } catch (error) {
      console.error("Error fetching whiteboards:", error)
      toast({
        title: "Error",
        description: "Failed to fetch whiteboards",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchWhiteboards()
    }
  }, [open, user])

  const handleWhiteboardSelect = async (whiteboard: Whiteboard) => {
    try {
      setIsLoadingWhiteboard(true)
      setLoadingWhiteboardId(whiteboard.id)

      const response = await fetch(`/api/whiteboards/${whiteboard.id || whiteboard._id}`)

      if (!response.ok) {
        throw new Error("Failed to fetch whiteboard")
      }

      const data = await response.json()

      // Convert MongoDB _id to id if needed
      const formattedWhiteboard = {
        ...data,
        id: data._id || data.id,
      }

      setCurrentWhiteboard(formattedWhiteboard)
      setElements(formattedWhiteboard.elements || [])

      toast({
        title: "Whiteboard loaded",
        description: `Successfully loaded "${formattedWhiteboard.name}"`,
      })

      setOpen(false)
    } catch (error) {
      console.error("Error loading whiteboard:", error)
      toast({
        title: "Error",
        description: "Failed to load whiteboard",
        variant: "destructive",
      })
    } finally {
      setIsLoadingWhiteboard(false)
      setLoadingWhiteboardId(null)
    }
  }

  const handleCreateNew = () => {
    setCurrentWhiteboard(null)
    setElements([])
    setOpen(false)

    toast({
      title: "New whiteboard created",
      description: "Start drawing on your blank canvas",
    })
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()

    try {
      setDeletingWhiteboardId(id)

      const response = await fetch(`/api/whiteboards/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete whiteboard")
      }

      setWhiteboards(whiteboards.filter((wb) => (wb.id || wb._id) !== id))
      toast({
        title: "Whiteboard deleted",
        description: "Your whiteboard has been deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting whiteboard:", error)
      toast({
        title: "Error",
        description: "Failed to delete whiteboard",
        variant: "destructive",
      })
    } finally {
      setDeletingWhiteboardId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="transition-all hover:scale-105">
          My Whiteboards
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>My Whiteboards</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto whiteboard-list">
          <Button
            variant="outline"
            className="w-full justify-start mb-2 transition-all hover:bg-primary hover:text-primary-foreground"
            onClick={handleCreateNew}
          >
            <Plus className="mr-2 h-4 w-4" /> Create New Whiteboard
          </Button>

          {isLoading ? (
            <div className="py-4 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              <p className="mt-2">Loading whiteboards...</p>
            </div>
          ) : whiteboards.length === 0 ? (
            <div className="py-4 text-center text-muted-foreground">
              {user ? "No whiteboards found" : "Please log in to view your whiteboards"}
            </div>
          ) : (
            <div className="space-y-2">
              {whiteboards.map((whiteboard) => (
                <div
                  key={whiteboard.id || whiteboard._id}
                  className="flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-accent group transition-all"
                  onClick={() => handleWhiteboardSelect(whiteboard)}
                >
                  <div>
                    <p className="font-medium">{whiteboard.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(whiteboard.updatedAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center">
                    {loadingWhiteboardId === (whiteboard.id || whiteboard._id) && isLoadingWhiteboard ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDelete(whiteboard.id || whiteboard._id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                      disabled={deletingWhiteboardId === (whiteboard.id || whiteboard._id)}
                    >
                      {deletingWhiteboardId === (whiteboard.id || whiteboard._id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
