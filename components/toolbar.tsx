"use client"

import type React from "react"

import { useWhiteboard } from "@/contexts/whiteboard-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import {
  Pencil,
  PenLineIcon as StraightLine,
  Square,
  Diamond,
  Circle,
  ArrowRight,
  Type,
  Undo2,
  Redo2,
  Trash2,
  Save,
  Download,
  Hand,
  MousePointer,
  Check,
} from "lucide-react"
import { useState, useEffect } from "react"
import { useTheme } from "@/contexts/theme-context"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/components/ui/use-toast"
import { Label } from "@/components/ui/label"

export function Toolbar() {
  const {
    currentWhiteboard,
    setCurrentWhiteboard,
    tool,
    setTool,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    clearCanvas,
    undo,
    redo,
    elements,
    selectedElement,
    deleteSelectedElement,
  } = useWhiteboard()
  const { theme } = useTheme()
  const { user } = useAuth()
  const [whiteboardName, setWhiteboardName] = useState(currentWhiteboard?.name || "Untitled Whiteboard")
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [customColor, setCustomColor] = useState(strokeColor)
  const [hexInput, setHexInput] = useState(strokeColor)
  const [isValidHex, setIsValidHex] = useState(true)

  // Update hex input when stroke color changes
  useEffect(() => {
    setHexInput(strokeColor)
    setCustomColor(strokeColor)
  }, [strokeColor])

  // Validate hex input
  useEffect(() => {
    const isValid = /^#([0-9A-F]{3}){1,2}$/i.test(hexInput)
    setIsValidHex(isValid)
  }, [hexInput])

  const tools = [
    { name: "select", icon: <MousePointer size={18} /> },
    { name: "hand", icon: <Hand size={18} /> },
    { name: "pencil", icon: <Pencil size={18} /> },
    { name: "line", icon: <StraightLine size={18} /> },
    { name: "rectangle", icon: <Square size={18} /> },
    { name: "diamond", icon: <Diamond size={18} /> },
    { name: "ellipse", icon: <Circle size={18} /> },
    { name: "arrow", icon: <ArrowRight size={18} /> },
    { name: "text", icon: <Type size={18} /> },
  ]

  // Some preset colors for quick selection
  const presetColors = [
    "#000000", // Black
    "#ffffff", // White
    "#ff0000", // Red
    "#00ff00", // Green
    "#0000ff", // Blue
    "#ffff00", // Yellow
    "#ff00ff", // Magenta
    "#00ffff", // Cyan
    "#ff8000", // Orange
    "#8000ff", // Purple
    "#008080", // Teal
    "#800000", // Maroon
  ]

  const handleColorChange = (color: string) => {
    setStrokeColor(color)
    setCustomColor(color)
    setHexInput(color)
  }

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setHexInput(value)

    // Only update color if it's a valid hex
    if (/^#([0-9A-F]{3}){1,2}$/i.test(value)) {
      setCustomColor(value)
      setStrokeColor(value)
    }
  }

  const handleHexInputBlur = () => {
    // If invalid hex, revert to current stroke color
    if (!isValidHex) {
      setHexInput(strokeColor)
    }
  }

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to save your whiteboard",
        variant: "destructive",
      })
      return
    }

    if (!user.id) {
      toast({
        title: "Error",
        description: "User ID is missing. Please try logging out and back in.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)
      const payload = {
        name: whiteboardName,
        elements,
      }

      let response

      if (currentWhiteboard?.id) {
        // Update existing whiteboard
        response = await fetch(`/api/whiteboards/${currentWhiteboard.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        // Create new whiteboard
        response = await fetch("/api/whiteboards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to save whiteboard: ${JSON.stringify(errorData)}`)
      }

      const savedWhiteboard = await response.json()
      setCurrentWhiteboard(savedWhiteboard)

      toast({
        title: "Whiteboard saved",
        description: "Your whiteboard has been saved successfully",
      })
    } catch (error) {
      console.error("Error saving whiteboard:", error)
      toast({
        title: "Error",
        description: "Failed to save whiteboard",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownload = () => {
    try {
      setIsDownloading(true)
      const canvas = document.querySelector("canvas")
      if (!canvas) return

      // Create a temporary link
      const link = document.createElement("a")
      link.download = `${whiteboardName.replace(/\s+/g, "-").toLowerCase()}.png`
      link.href = canvas.toDataURL("image/png")
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Download complete",
        description: "Your whiteboard has been downloaded as a PNG image",
      })
    } catch (error) {
      console.error("Error downloading whiteboard:", error)
      toast({
        title: "Error",
        description: "Failed to download whiteboard",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className={`flex items-center p-2 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
      {/* Left section - Whiteboard name */}
      <div className="flex items-center gap-2 w-1/4">
        <Input
          value={whiteboardName}
          onChange={(e) => setWhiteboardName(e.target.value)}
          className="w-48 text-sm"
          aria-label="Whiteboard name"
        />
      </div>

      {/* Middle section - Drawing tools */}
      <div className="flex items-center justify-center gap-1 w-2/4">
        {tools.map((t) => (
          <Button
            key={t.name}
            variant={tool === t.name ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool(t.name as any)}
            title={t.name.charAt(0).toUpperCase() + t.name.slice(1)}
            className={`relative transition-all hover:scale-110 ${tool === t.name ? "ring-2 ring-primary" : ""}`}
          >
            {t.icon}
          </Button>
        ))}

        <div className="mx-1 h-6 w-px bg-gray-300 dark:bg-gray-700" />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative transition-all hover:scale-110"
              style={{ backgroundColor: strokeColor }}
            >
              <span className="sr-only">Pick a color</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-4">
              {/* Color picker */}
              <div>
                <Label htmlFor="color-picker" className="text-sm font-medium">
                  Color Picker
                </Label>
                <div className="flex mt-1">
                  <input
                    type="color"
                    id="color-picker"
                    value={customColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-full h-10 cursor-pointer rounded-md border"
                  />
                </div>
              </div>

              {/* Hex input */}
              <div>
                <Label htmlFor="hex-input" className="text-sm font-medium">
                  Hex Color
                </Label>
                <div className="flex mt-1">
                  <Input
                    id="hex-input"
                    value={hexInput}
                    onChange={handleHexInputChange}
                    onBlur={handleHexInputBlur}
                    className={`font-mono ${!isValidHex ? "border-red-500" : ""}`}
                    placeholder="#000000"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2"
                    onClick={() => handleColorChange(hexInput)}
                    disabled={!isValidHex}
                  >
                    <Check size={16} />
                  </Button>
                </div>
                {!isValidHex && (
                  <p className="text-xs text-red-500 mt-1">Please enter a valid hex color (e.g., #FF0000)</p>
                )}
              </div>

              {/* Preset colors */}
              <div>
                <Label className="text-sm font-medium">Preset Colors</Label>
                <div className="grid grid-cols-6 gap-2 mt-1">
                  {presetColors.map((color) => (
                    <Button
                      key={color}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full border transition-all hover:scale-110 relative"
                      style={{
                        backgroundColor: color,
                        borderColor: theme === "dark" ? "#fff" : "#000",
                      }}
                      onClick={() => handleColorChange(color)}
                    >
                      {color === strokeColor && (
                        <Check size={14} className={`absolute ${color === "#ffffff" ? "text-black" : "text-white"}`} />
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="transition-all hover:scale-110">
              <span className="block h-1 w-8 bg-current rounded-full" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-2">
              <p className="text-sm font-medium">Stroke Width</p>
              <Slider
                min={1}
                max={20}
                step={1}
                value={[strokeWidth]}
                onValueChange={(value) => setStrokeWidth(value[0])}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Right section - History, Delete and Canvas actions */}
      <div className="flex items-center justify-end gap-1 w-1/4">
        {/* History and Delete controls */}
        <div className="flex items-center gap-1 mr-6">
          {selectedElement && (
            <Button
              variant="ghost"
              size="icon"
              onClick={deleteSelectedElement}
              title="Delete selected"
              className="transition-all hover:scale-110"
            >
              <Trash2 size={18} />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={undo} title="Undo" className="transition-all hover:scale-110">
            <Undo2 size={18} />
          </Button>
          <Button variant="ghost" size="icon" onClick={redo} title="Redo" className="transition-all hover:scale-110">
            <Redo2 size={18} />
          </Button>
        </div>

        {/* Canvas actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={clearCanvas}
            title="Clear"
            className="text-red-500 transition-all hover:scale-110"
          >
            <Trash2 size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            title="Save"
            disabled={isSaving}
            className="transition-all hover:scale-110"
          >
            {isSaving ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Save size={18} />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            title="Download"
            disabled={isDownloading}
            className="transition-all hover:scale-110"
          >
            {isDownloading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Download size={18} />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
