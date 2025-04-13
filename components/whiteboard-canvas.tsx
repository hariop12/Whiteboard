"use client"

import type React from "react"

import { useRef, useEffect, useState } from "react"
import { useWhiteboard } from "@/contexts/whiteboard-context"
import type { DrawElement, Point } from "@/types"
import { useTheme } from "@/contexts/theme-context"
import { v4 as uuidv4 } from "uuid"
import { toast } from "@/components/ui/use-toast"

export function WhiteboardCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const textContainerRef = useRef<HTMLDivElement>(null)
  const editButtonRef = useRef<HTMLDivElement>(null)
  const {
    elements,
    setElements,
    tool,
    strokeColor,
    strokeWidth,
    isDrawing,
    startDrawing,
    draw,
    endDrawing,
    currentElement,
    selectedElement,
    setSelectedElement,
    moveElement,
    resizeElement,
    undo,
    redo,
  } = useWhiteboard()
  const { theme } = useTheme()
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [scale, setScale] = useState<number>(1)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 })
  const [isMovingElement, setIsMovingElement] = useState<boolean>(false)
  const [isResizing, setIsResizing] = useState<boolean>(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [textFontSize, setTextFontSize] = useState<number>(16)

  // Text input state
  const [textInput, setTextInput] = useState<string>("")
  const [isEditingText, setIsEditingText] = useState<boolean>(false)
  const [textPosition, setTextPosition] = useState<Point | null>(null)
  const [isTextAreaFocused, setIsTextAreaFocused] = useState<boolean>(false)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [isResizingText, setIsResizingText] = useState<boolean>(false)
  const [textResizeStart, setTextResizeStart] = useState<Point | null>(null)
  const [initialFontSize, setInitialFontSize] = useState<number>(16)
  const [showEditButton, setShowEditButton] = useState<boolean>(false)
  const [editButtonPosition, setEditButtonPosition] = useState<Point | null>(null)

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth
        canvasRef.current.height = containerRef.current.clientHeight
        drawElements()
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  // Draw elements when they change
  useEffect(() => {
    drawElements()
  }, [elements, offset, scale, theme, currentElement, selectedElement])

  // Focus text input when editing text
  useEffect(() => {
    if (isEditingText && textAreaRef.current) {
      // Use a small timeout to ensure the element is properly rendered before focusing
      const timer = setTimeout(() => {
        if (textAreaRef.current) {
          textAreaRef.current.focus()
          setIsTextAreaFocused(true)
        }
      }, 10)
      return () => clearTimeout(timer)
    }
  }, [isEditingText])

  // Handle clicks outside the text area
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isEditingText &&
        textContainerRef.current &&
        !textContainerRef.current.contains(e.target as Node) &&
        isTextAreaFocused
      ) {
        // Only handle the click if the text area has been focused first
        // This prevents the immediate disappearance on creation
        if (textInput.trim()) {
          addTextElement()
        } else {
          setIsEditingText(false)
          setTextPosition(null)
          setEditingTextId(null)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isEditingText, textInput, isTextAreaFocused, editingTextId])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts if we're editing text
      if (isEditingText) {
        if (e.key === "Escape") {
          setIsEditingText(false)
          setTextPosition(null)
          setIsTextAreaFocused(false)
          setEditingTextId(null)
        }
        return
      }

      // Undo/Redo shortcuts
      if (e.key === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        if (e.shiftKey) {
          // Ctrl+Shift+Z for redo
          redo()
        } else {
          // Ctrl+Z for undo
          undo()
        }
        return
      }

      if (e.key === "y" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        // Ctrl+Y for redo
        redo()
        return
      }

      // Delete selected element
      if ((e.key === "Delete" || e.key === "Backspace") && selectedElement) {
        e.preventDefault()
        const newElements = elements.filter((el) => el.id !== selectedElement.id)
        setElements(newElements)
        setSelectedElement(null)
        return
      }

      // Deselect element
      if (e.key === "Escape" && selectedElement) {
        setSelectedElement(null)
        return
      }

      // Arrow key navigation for selected element
      if (selectedElement && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault()

        const moveDistance = e.shiftKey ? 10 : 1
        let dx = 0
        let dy = 0

        switch (e.key) {
          case "ArrowUp":
            dy = -moveDistance
            break
          case "ArrowDown":
            dy = moveDistance
            break
          case "ArrowLeft":
            dx = -moveDistance
            break
          case "ArrowRight":
            dx = moveDistance
            break
        }

        moveElement(selectedElement.id, dx, dy)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [selectedElement, isEditingText, elements, setElements, setSelectedElement, undo, redo, moveElement])

  // Update edit button position when selected element changes
  useEffect(() => {
    if (selectedElement && selectedElement.type === "text" && selectedElement.position) {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const pos = {
        x: selectedElement.position.x * scale + offset.x,
        y: selectedElement.position.y * scale + offset.y,
      }
      const fontSize = selectedElement.fontSize || 16
      ctx.font = `${fontSize * scale}px sans-serif`

      // Calculate text dimensions
      const lines = selectedElement.text?.split("\n") || []
      const lineHeight = fontSize * scale * 1.2
      let maxWidth = 0

      lines.forEach((line) => {
        const metrics = ctx.measureText(line)
        maxWidth = Math.max(maxWidth, metrics.width)
      })

      const padding = 5 * scale

      setEditButtonPosition({
        x: pos.x + maxWidth + padding + 10,
        y: pos.y - fontSize * scale,
      })
      setShowEditButton(true)
    } else {
      setShowEditButton(false)
      setEditButtonPosition(null)
    }
  }, [selectedElement, scale, offset])

  const drawElements = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set background color based on theme
    ctx.fillStyle = theme === "dark" ? "#1a1a1a" : "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid
    drawGrid(ctx, canvas.width, canvas.height)

    // Draw elements
    elements.forEach((element) => {
      drawElement(ctx, element, element.id === selectedElement?.id)
    })

    // Draw current element (while drawing)
    if (currentElement) {
      drawElement(ctx, currentElement, false)
    }

    // Draw selection handles if an element is selected
    if (selectedElement) {
      drawSelectionHandles(ctx, selectedElement)
    }
  }

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 20 * scale
    const offsetX = offset.x % gridSize
    const offsetY = offset.y % gridSize

    ctx.beginPath()
    ctx.strokeStyle = theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
    ctx.lineWidth = 1

    // Draw vertical lines
    for (let x = offsetX; x < width; x += gridSize) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
    }

    // Draw horizontal lines
    for (let y = offsetY; y < height; y += gridSize) {
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
    }

    ctx.stroke()
  }

  const drawElement = (ctx: CanvasRenderingContext2D, element: DrawElement, isSelected: boolean) => {
    ctx.strokeStyle = element.strokeColor
    ctx.lineWidth = element.strokeWidth * scale
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    const transformPoint = (point: Point): Point => ({
      x: point.x * scale + offset.x,
      y: point.y * scale + offset.y,
    })

    switch (element.type) {
      case "pencil":
        if (element.points.length < 2) return
        ctx.beginPath()
        const startPoint = transformPoint(element.points[0])
        ctx.moveTo(startPoint.x, startPoint.y)

        for (let i = 1; i < element.points.length; i++) {
          const point = transformPoint(element.points[i])
          ctx.lineTo(point.x, point.y)
        }
        ctx.stroke()
        break

      case "line":
        if (element.points.length < 2) return
        ctx.beginPath()
        const start = transformPoint(element.points[0])
        const end = transformPoint(element.points[1])
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()
        break

      case "rectangle":
        if (element.points.length < 2) return
        const [p1, p2] = element.points.map(transformPoint)
        ctx.beginPath()
        ctx.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y)
        ctx.stroke()
        break

      case "diamond":
        if (element.points.length < 2) return
        const [d1, d2] = element.points.map(transformPoint)
        const centerX = (d1.x + d2.x) / 2
        const centerY = (d1.y + d2.y) / 2
        const width = Math.abs(d2.x - d1.x)
        const height = Math.abs(d2.y - d1.y)

        ctx.beginPath()
        ctx.moveTo(centerX, d1.y)
        ctx.lineTo(d2.x, centerY)
        ctx.lineTo(centerX, d2.y)
        ctx.lineTo(d1.x, centerY)
        ctx.closePath()
        ctx.stroke()
        break

      case "ellipse":
        if (element.points.length < 2) return
        const [e1, e2] = element.points.map(transformPoint)
        const radiusX = Math.abs(e2.x - e1.x) / 2
        const radiusY = Math.abs(e2.y - e1.y) / 2
        const centerEX = (e1.x + e2.x) / 2
        const centerEY = (e1.y + e2.y) / 2

        ctx.beginPath()
        ctx.ellipse(centerEX, centerEY, radiusX, radiusY, 0, 0, 2 * Math.PI)
        ctx.stroke()
        break

      case "arrow":
        if (element.points.length < 2) return
        const [a1, a2] = element.points.map(transformPoint)
        const angle = Math.atan2(a2.y - a1.y, a2.x - a1.x)
        const arrowLength = 15 * scale

        ctx.beginPath()
        ctx.moveTo(a1.x, a1.y)
        ctx.lineTo(a2.x, a2.y)
        ctx.stroke()

        // Draw arrowhead
        ctx.beginPath()
        ctx.moveTo(a2.x, a2.y)
        ctx.lineTo(
          a2.x - arrowLength * Math.cos(angle - Math.PI / 6),
          a2.y - arrowLength * Math.sin(angle - Math.PI / 6),
        )
        ctx.moveTo(a2.x, a2.y)
        ctx.lineTo(
          a2.x - arrowLength * Math.cos(angle + Math.PI / 6),
          a2.y - arrowLength * Math.sin(angle + Math.PI / 6),
        )
        ctx.stroke()
        break

      case "text":
        if (!element.text || !element.position) return
        const pos = transformPoint(element.position)
        const fontSize = element.fontSize || 16
        ctx.font = `${fontSize * scale}px sans-serif`
        ctx.fillStyle = element.strokeColor

        // Split text by newlines and render each line
        const lines = element.text.split("\n")
        const lineHeight = fontSize * scale * 1.2

        lines.forEach((line, index) => {
          ctx.fillText(line, pos.x, pos.y + index * lineHeight)
        })
        break
    }

    // Draw selection outline if selected
    if (isSelected) {
      ctx.strokeStyle = "#4285f4"
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])

      if (element.type === "pencil") {
        // For pencil, draw a bounding box
        let minX = Number.POSITIVE_INFINITY,
          minY = Number.POSITIVE_INFINITY,
          maxX = Number.NEGATIVE_INFINITY,
          maxY = Number.NEGATIVE_INFINITY
        element.points.forEach((point) => {
          const p = transformPoint(point)
          minX = Math.min(minX, p.x)
          minY = Math.min(minY, p.y)
          maxX = Math.max(maxX, p.x)
          maxY = Math.max(maxY, p.y)
        })
        ctx.strokeRect(minX - 5, minY - 5, maxX - minX + 10, maxY - minY + 10)
      } else if (element.type === "line" || element.type === "arrow") {
        // For line, just highlight the line
        const [p1, p2] = element.points.map(transformPoint)
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      } else if (element.type === "rectangle") {
        // For rectangle, highlight the rectangle
        const [p1, p2] = element.points.map(transformPoint)
        ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y)
      } else if (element.type === "diamond") {
        // For diamond, highlight the diamond
        const [d1, d2] = element.points.map(transformPoint)
        const centerX = (d1.x + d2.x) / 2
        const centerY = (d1.y + d2.y) / 2
        ctx.beginPath()
        ctx.moveTo(centerX, d1.y)
        ctx.lineTo(d2.x, centerY)
        ctx.lineTo(centerX, d2.y)
        ctx.lineTo(d1.x, centerY)
        ctx.closePath()
        ctx.stroke()
      } else if (element.type === "ellipse") {
        // For ellipse, highlight the ellipse
        const [e1, e2] = element.points.map(transformPoint)
        const radiusX = Math.abs(e2.x - e1.x) / 2
        const radiusY = Math.abs(e2.y - e1.y) / 2
        const centerEX = (e1.x + e2.x) / 2
        const centerEY = (e1.y + e2.y) / 2
        ctx.beginPath()
        ctx.ellipse(centerEX, centerEY, radiusX, radiusY, 0, 0, 2 * Math.PI)
        ctx.stroke()
      } else if (element.type === "text" && element.position) {
        // For text, draw a box around it
        const pos = transformPoint(element.position)
        const fontSize = element.fontSize || 16
        ctx.font = `${fontSize * scale}px sans-serif`

        // Calculate text dimensions
        const lines = element.text.split("\n")
        const lineHeight = fontSize * scale * 1.2
        let maxWidth = 0

        lines.forEach((line) => {
          const metrics = ctx.measureText(line)
          maxWidth = Math.max(maxWidth, metrics.width)
        })

        const textHeight = lines.length * lineHeight

        // Draw selection box with proper padding
        const padding = 5 * scale
        ctx.strokeRect(pos.x - padding, pos.y - fontSize * scale, maxWidth + padding * 2, textHeight + padding * 2)
      }

      ctx.setLineDash([])
    }
  }

  const drawSelectionHandles = (ctx: CanvasRenderingContext2D, element: DrawElement) => {
    if (element.type === "pencil") return // No resize handles for pencil

    const transformPoint = (point: Point): Point => ({
      x: point.x * scale + offset.x,
      y: point.y * scale + offset.y,
    })

    ctx.fillStyle = "#4285f4"
    ctx.strokeStyle = "white"
    ctx.lineWidth = 2

    if (element.type === "text" && element.position) {
      // For text, add a handle at the position and a resize handle
      const pos = transformPoint(element.position)
      const fontSize = element.fontSize || 16
      ctx.font = `${fontSize * scale}px sans-serif`

      // Calculate text dimensions
      const lines = element.text.split("\n")
      const lineHeight = fontSize * scale * 1.2
      let maxWidth = 0

      lines.forEach((line) => {
        const metrics = ctx.measureText(line)
        maxWidth = Math.max(maxWidth, metrics.width)
      })

      const textHeight = lines.length * lineHeight
      const padding = 5 * scale

      // Position handle (top-left)
      ctx.beginPath()
      ctx.arc(pos.x - padding, pos.y - fontSize * scale, 6, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()

      // Resize handle (bottom right corner)
      ctx.beginPath()
      ctx.arc(pos.x + maxWidth + padding, pos.y + textHeight + padding, 6, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()

      return
    }

    if (element.points.length < 2) return

    const [p1, p2] = element.points.map(transformPoint)

    // Draw handles at corners and midpoints
    const handles = [
      { x: p1.x, y: p1.y, id: "nw" },
      { x: p2.x, y: p1.y, id: "ne" },
      { x: p2.x, y: p2.y, id: "se" },
      { x: p1.x, y: p2.y, id: "sw" },
      { x: (p1.x + p2.x) / 2, y: p1.y, id: "n" },
      { x: p2.x, y: (p1.y + p2.y) / 2, id: "e" },
      { x: (p1.x + p2.x) / 2, y: p2.y, id: "s" },
      { x: p1.x, y: (p1.y + p2.y) / 2, id: "w" },
    ]

    handles.forEach((handle) => {
      ctx.beginPath()
      ctx.arc(handle.x, handle.y, 6, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()
    })

    // Add tooltip for keyboard navigation
    if (selectedElement) {
      const [p1, p2] = element.points.map(transformPoint)
      const centerX = (p1.x + p2.x) / 2
      const centerY = p2.y + 20 // Position below the element

      ctx.font = "12px sans-serif"
      ctx.fillStyle = "#4285f4"
      ctx.textAlign = "center"
      ctx.fillText("Use arrow keys to move", centerX, centerY)
    }
  }

  const getResizeHandleAtPoint = (point: Point, element: DrawElement): string | null => {
    if (element.type === "pencil") return null

    const transformPoint = (p: Point): Point => ({
      x: p.x * scale + offset.x,
      y: p.y * scale + offset.y,
    })

    if (element.type === "text" && element.position) {
      const pos = transformPoint(element.position)
      const fontSize = element.fontSize || 16
      const canvas = canvasRef.current
      if (!canvas) return null

      const ctx = canvas.getContext("2d")
      if (!ctx) return null

      ctx.font = `${fontSize * scale}px sans-serif`

      // Calculate text dimensions
      const lines = element.text?.split("\n") || []
      const lineHeight = fontSize * scale * 1.2
      let maxWidth = 0

      lines.forEach((line) => {
        const metrics = ctx.measureText(line)
        maxWidth = Math.max(maxWidth, metrics.width)
      })

      const textHeight = lines.length * lineHeight
      const padding = 5 * scale

      // Check if clicking on resize handle (bottom right)
      if (
        Math.abs(point.x - (pos.x + maxWidth + padding)) < 10 &&
        Math.abs(point.y - (pos.y + textHeight + padding)) < 10
      ) {
        return "text-resize"
      }

      return null
    }

    if (element.points.length < 2) return null

    const [p1, p2] = element.points.map(transformPoint)

    // Draw handles at corners and midpoints
    const handles = [
      { x: p1.x, y: p1.y, id: "nw" },
      { x: p2.x, y: p1.y, id: "ne" },
      { x: p2.x, y: p2.y, id: "se" },
      { x: p1.x, y: p2.y, id: "sw" },
      { x: (p1.x + p2.x) / 2, y: p1.y, id: "n" },
      { x: p2.x, y: (p1.y + p2.y) / 2, id: "e" },
      { x: (p1.x + p2.x) / 2, y: p2.y, id: "s" },
      { x: p1.x, y: (p1.y + p2.y) / 2, id: "w" },
    ]

    for (const handle of handles) {
      if (Math.abs(handle.x - point.x) < 10 && Math.abs(handle.y - point.y) < 10) {
        return handle.id
      }
    }

    return null
  }

  const isPointInElement = (point: Point, element: DrawElement): boolean => {
    if (element.type === "pencil") {
      // For pencil, check if point is close to any point in the path
      return element.points.some((p) => {
        const transformedP = {
          x: p.x * scale + offset.x,
          y: p.y * scale + offset.y,
        }
        return Math.sqrt(Math.pow(transformedP.x - point.x, 2) + Math.pow(transformedP.y - point.y, 2)) < 10
      })
    } else if (element.type === "line" || element.type === "arrow") {
      // For line, check if point is close to the line
      if (element.points.length < 2) return false
      const [p1, p2] = element.points.map((p) => ({
        x: p.x * scale + offset.x,
        y: p.y * scale + offset.y,
      }))
      const distance = distancePointToLine(point, p1, p2)
      return distance < 10
    } else if (element.type === "rectangle") {
      // For rectangle, check if point is inside
      if (element.points.length < 2) return false
      const [p1, p2] = element.points.map((p) => ({
        x: p.x * scale + offset.x,
        y: p.y * scale + offset.y,
      }))
      return (
        point.x >= Math.min(p1.x, p2.x) &&
        point.x <= Math.max(p1.x, p2.x) &&
        point.y >= Math.min(p1.y, p2.y) &&
        point.y <= Math.max(p1.y, p2.y)
      )
    } else if (element.type === "diamond") {
      // For diamond, check if point is inside
      if (element.points.length < 2) return false
      const [p1, p2] = element.points.map((p) => ({
        x: p.x * scale + offset.x,
        y: p.y * scale + offset.y,
      }))
      const centerX = (p1.x + p2.x) / 2
      const centerY = (p1.y + p2.y) / 2
      const halfWidth = Math.abs(p2.x - p1.x) / 2
      const halfHeight = Math.abs(p2.y - p1.y) / 2

      // Diamond equation: |x - centerX|/halfWidth + |y - centerY|/halfHeight <= 1
      return Math.abs(point.x - centerX) / halfWidth + Math.abs(point.y - centerY) / halfHeight <= 1
    } else if (element.type === "ellipse") {
      // For ellipse, check if point is inside
      if (element.points.length < 2) return false
      const [p1, p2] = element.points.map((p) => ({
        x: p.x * scale + offset.x,
        y: p.y * scale + offset.y,
      }))
      const centerX = (p1.x + p2.x) / 2
      const centerY = (p1.y + p2.y) / 2
      const radiusX = Math.abs(p2.x - p1.x) / 2
      const radiusY = Math.abs(p2.y - p1.y) / 2

      // Ellipse equation: (x - centerX)²/radiusX² + (y - centerY)²/radiusY² <= 1
      return (
        Math.pow(point.x - centerX, 2) / Math.pow(radiusX, 2) + Math.pow(point.y - centerY, 2) / Math.pow(radiusY, 2) <=
        1
      )
    } else if (element.type === "text") {
      // For text, check if point is near the position
      if (!element.position) return false
      const pos = {
        x: element.position.x * scale + offset.x,
        y: element.position.y * scale + offset.y,
      }

      const fontSize = element.fontSize || 16
      const canvas = canvasRef.current
      if (!canvas) return false

      const ctx = canvas.getContext("2d")
      if (!ctx) return false

      ctx.font = `${fontSize * scale}px sans-serif`

      // Calculate text dimensions
      const lines = element.text?.split("\n") || []
      const lineHeight = fontSize * scale * 1.2
      let maxWidth = 0

      lines.forEach((line) => {
        const metrics = ctx.measureText(line)
        maxWidth = Math.max(maxWidth, metrics.width)
      })

      const textHeight = lines.length * lineHeight
      const padding = 5 * scale

      return (
        point.x >= pos.x - padding &&
        point.x <= pos.x + maxWidth + padding &&
        point.y >= pos.y - fontSize * scale - padding &&
        point.y <= pos.y + textHeight + padding
      )
    }
    return false
  }

  const distancePointToLine = (point: Point, lineStart: Point, lineEnd: Point): number => {
    const A = point.x - lineStart.x
    const B = point.y - lineStart.y
    const C = lineEnd.x - lineStart.x
    const D = lineEnd.y - lineStart.y

    const dot = A * C + B * D
    const lenSq = C * C + D * D
    let param = -1

    if (lenSq !== 0) param = dot / lenSq

    let xx, yy

    if (param < 0) {
      xx = lineStart.x
      yy = lineStart.y
    } else if (param > 1) {
      xx = lineEnd.x
      yy = lineEnd.y
    } else {
      xx = lineStart.x + param * C
      yy = lineStart.y + param * D
    }

    const dx = point.x - xx
    const dy = point.y - yy
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Function to add text element to canvas
  const addTextElement = () => {
    if (!textPosition || !textInput.trim()) {
      // Just clear the text input state without adding an element
      setTextInput("")
      setIsEditingText(false)
      setTextPosition(null)
      setIsTextAreaFocused(false)
      setEditingTextId(null)
      return
    }

    if (editingTextId) {
      // Update existing text element
      setElements((prevElements) =>
        prevElements.map((element) => {
          if (element.id === editingTextId) {
            return {
              ...element,
              text: textInput,
              fontSize: textFontSize,
            }
          }
          return element
        }),
      )

      toast({
        title: "Text updated",
        description: "Text element has been updated",
      })
    } else {
      // Create new text element
      const newElement: DrawElement = {
        id: uuidv4(),
        type: "text",
        points: [],
        strokeColor,
        strokeWidth,
        text: textInput,
        position: textPosition,
        fontSize: textFontSize,
      }

      const updatedElements = [...elements, newElement]
      setElements(updatedElements)

      toast({
        title: "Text added",
        description: "Text element has been added to the canvas",
      })
    }

    // Reset text input state
    setTextInput("")
    setIsEditingText(false)
    setTextPosition(null)
    setIsTextAreaFocused(false)
    setEditingTextId(null)
  }

  const startEditingText = (element: DrawElement) => {
    if (element.type !== "text" || !element.position) return

    setTextInput(element.text || "")
    setTextPosition(element.position)
    setIsEditingText(true)
    setEditingTextId(element.id)
    setTextFontSize(element.fontSize || 16)
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // If we're currently editing text, don't handle mouse down on canvas
    if (isEditingText) {
      return
    }

    if (e.button === 1 || (e.button === 0 && (e.ctrlKey || tool === "hand"))) {
      // Middle mouse button or Ctrl+left click or hand tool for panning
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      return
    }

    if (e.button === 0) {
      // Left mouse button

      // First, check if clicking on any existing element, regardless of the current tool
      // Find the topmost element that contains the point
      const clickedElement = [...elements].reverse().find((el) => isPointInElement({ x, y }, el))

      // If we found an element and it's already selected, check for resize handles
      if (clickedElement && selectedElement && clickedElement.id === selectedElement.id) {
        const handle = getResizeHandleAtPoint({ x, y }, selectedElement)
        if (handle) {
          if (handle === "text-resize" && selectedElement.type === "text") {
            setIsResizingText(true)
            setTextResizeStart({ x: e.clientX, y: e.clientY })
            setInitialFontSize(selectedElement.fontSize || 16)
            return
          } else {
            setIsResizing(true)
            setResizeHandle(handle)
            return
          }
        }

        // Double click on text to edit
        if (clickedElement.type === "text" && e.detail === 2) {
          startEditingText(clickedElement)
          return
        }

        // If not clicking on a handle but on the selected element, prepare to move it
        setIsMovingElement(true)
        setDragStart({ x: e.clientX, y: e.clientY })
        return
      }

      // If we found an element but it's not the currently selected one
      if (clickedElement) {
        setSelectedElement(clickedElement)

        // Double click on text to edit
        if (clickedElement.type === "text" && e.detail === 2) {
          startEditingText(clickedElement)
          return
        }

        setIsMovingElement(true)
        setDragStart({ x: e.clientX, y: e.clientY })
        return
      } else {
        // If we didn't click on any element, deselect the current element
        setSelectedElement(null)
      }

      // If we reach here, we're not interacting with any existing element
      // Handle text tool separately
      if (tool === "text") {
        const canvasPoint = {
          x: (x - offset.x) / scale,
          y: (y - offset.y) / scale,
        }

        setTextPosition(canvasPoint)
        setIsEditingText(true)
        setTextInput("")
        setEditingTextId(null)
        setIsTextAreaFocused(false)
        return
      }

      // Start drawing for other tools
      const drawPoint = {
        x: (x - offset.x) / scale,
        y: (y - offset.y) / scale,
      }
      startDrawing(drawPoint)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (isDragging) {
      // Handle panning
      const dx = e.clientX - dragStart.x
      const dy = e.clientY - dragStart.y
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
      setDragStart({ x: e.clientX, y: e.clientY })
    } else if (isResizingText && selectedElement && selectedElement.type === "text" && textResizeStart) {
      // Handle text resizing
      const dy = e.clientY - textResizeStart.y
      const newFontSize = Math.max(8, initialFontSize + dy / 2)

      setElements((prevElements) =>
        prevElements.map((element) => {
          if (element.id === selectedElement.id) {
            return {
              ...element,
              fontSize: newFontSize,
            }
          }
          return element
        }),
      )

      // Update the selected element reference
      const updatedElement = elements.find((el) => el.id === selectedElement.id)
      if (updatedElement) {
        setSelectedElement(updatedElement)
      }
    } else if (isMovingElement && selectedElement) {
      // Handle moving element
      const dx = (e.clientX - dragStart.x) / scale
      const dy = (e.clientY - dragStart.y) / scale
      moveElement(selectedElement.id, dx, dy)

      // Update the selected element reference to match the moved element
      const updatedElement = elements.find((el) => el.id === selectedElement.id)
      if (updatedElement) {
        setSelectedElement(updatedElement)
      }

      setDragStart({ x: e.clientX, y: e.clientY })
    } else if (isResizing && selectedElement && resizeHandle) {
      // Handle resizing element
      const newPoint = {
        x: (x - offset.x) / scale,
        y: (y - offset.y) / scale,
      }

      if (selectedElement.points.length >= 2) {
        const [p1, p2] = selectedElement.points
        let newPoints: Point[] = []

        switch (resizeHandle) {
          case "nw":
            newPoints = [newPoint, p2]
            break
          case "ne":
            newPoints = [
              { x: p1.x, y: newPoint.y },
              { x: newPoint.x, y: p2.y },
            ]
            break
          case "se":
            newPoints = [p1, newPoint]
            break
          case "sw":
            newPoints = [
              { x: newPoint.x, y: p1.y },
              { x: p2.x, y: newPoint.y },
            ]
            break
          case "n":
            newPoints = [
              { x: p1.x, y: newPoint.y },
              { x: p2.x, y: p2.y },
            ]
            break
          case "e":
            newPoints = [
              { x: p1.x, y: p1.y },
              { x: newPoint.x, y: p2.y },
            ]
            break
          case "s":
            newPoints = [
              { x: p1.x, y: p1.y },
              { x: p2.x, y: newPoint.y },
            ]
            break
          case "w":
            newPoints = [
              { x: newPoint.x, y: p1.y },
              { x: p2.x, y: p2.y },
            ]
            break
        }

        resizeElement(selectedElement.id, newPoints)
      }
    } else if (isDrawing) {
      // Handle drawing
      const drawPoint = {
        x: (x - offset.x) / scale,
        y: (y - offset.y) / scale,
      }
      draw(drawPoint)
    }
  }

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false)
    } else if (isMovingElement) {
      setIsMovingElement(false)
    } else if (isResizing) {
      setIsResizing(false)
      setResizeHandle(null)
    } else if (isResizingText) {
      setIsResizingText(false)
      setTextResizeStart(null)
    } else if (isDrawing) {
      endDrawing()
    }
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Calculate point under mouse before zoom
    const pointXBeforeZoom = (mouseX - offset.x) / scale
    const pointYBeforeZoom = (mouseY - offset.y) / scale

    // Adjust scale
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.min(Math.max(scale * zoomFactor, 0.1), 5)

    // Calculate point under mouse after zoom
    const pointXAfterZoom = (mouseX - offset.x) / newScale
    const pointYAfterZoom = (mouseY - offset.y) / newScale

    // Adjust offset to keep point under mouse
    const newOffsetX = offset.x + (pointXAfterZoom - pointXBeforeZoom) * newScale
    const newOffsetY = offset.y + (pointYAfterZoom - pointYBeforeZoom) * newScale

    setScale(newScale)
    setOffset({ x: newOffsetX, y: newOffsetY })
  }

  const handleEditButtonClick = () => {
    if (selectedElement && selectedElement.type === "text") {
      startEditingText(selectedElement)
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden relative">
      <canvas
        ref={canvasRef}
        className="touch-none cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Text input overlay */}
      {isEditingText && textPosition && (
        <div
          ref={textContainerRef}
          className="absolute z-50"
          style={{
            left: `${textPosition.x * scale + offset.x}px`,
            top: `${textPosition.y * scale + offset.y - 20}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            ref={textAreaRef}
            className="bg-transparent border-2 border-blue-500 outline-none resize-none p-2 min-w-[150px] min-h-[40px]"
            style={{
              color: strokeColor,
              fontSize: `${textFontSize * scale}px`,
            }}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onFocus={() => setIsTextAreaFocused(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.shiftKey) {
                // Allow shift+enter for new lines
                return
              } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                addTextElement()
              } else if (e.key === "Escape") {
                e.preventDefault()
                setIsEditingText(false)
                setTextPosition(null)
                setIsTextAreaFocused(false)
                setEditingTextId(null)
              }
            }}
            placeholder="Type here..."
            autoFocus
          />
        </div>
      )}

      {/* Edit button for text */}
      {showEditButton && editButtonPosition && (
        <div
          ref={editButtonRef}
          className="absolute z-40 bg-blue-500 w-8 h-8 flex items-center justify-center rounded cursor-pointer hover:bg-blue-600 transition-colors"
          style={{
            left: `${editButtonPosition.x}px`,
            top: `${editButtonPosition.y}px`,
          }}
          onClick={handleEditButtonClick}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white"
          >
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </div>
      )}
    </div>
  )
}
