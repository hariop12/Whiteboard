"use client"

import type React from "react"

import { createContext, useContext, useState, useCallback } from "react"
import type { DrawElement, Point, Whiteboard } from "@/types"
import { v4 as uuidv4 } from "uuid"
import { toast } from "@/components/ui/use-toast"

type Tool = "pencil" | "line" | "rectangle" | "diamond" | "ellipse" | "arrow" | "text" | "select" | "hand"

type WhiteboardContextType = {
  currentWhiteboard: Whiteboard | null
  setCurrentWhiteboard: (whiteboard: Whiteboard | null) => void
  elements: DrawElement[]
  setElements: (elements: DrawElement[]) => void
  tool: Tool
  setTool: (tool: Tool) => void
  strokeColor: string
  setStrokeColor: (color: string) => void
  strokeWidth: number
  setStrokeWidth: (width: number) => void
  isDrawing: boolean
  setIsDrawing: (isDrawing: boolean) => void
  startDrawing: (point: Point) => void
  draw: (point: Point) => void
  endDrawing: () => void
  clearCanvas: () => void
  undo: () => void
  redo: () => void
  history: DrawElement[][]
  historyIndex: number
  selectedElement: DrawElement | null
  setSelectedElement: (element: DrawElement | null) => void
  moveElement: (id: string, dx: number, dy: number) => void
  resizeElement: (id: string, newPoints: Point[]) => void
  currentElement: DrawElement | null
  textInput: string
  setTextInput: (text: string) => void
  isEditingText: boolean
  setIsEditingText: (isEditing: boolean) => void
  textPosition: Point | null
  setTextPosition: (position: Point | null) => void
  finishTextEditing: () => void
  deleteSelectedElement: () => void
}

const WhiteboardContext = createContext<WhiteboardContextType>({
  currentWhiteboard: null,
  setCurrentWhiteboard: () => {},
  elements: [],
  setElements: () => {},
  tool: "pencil",
  setTool: () => {},
  strokeColor: "#000000",
  setStrokeColor: () => {},
  strokeWidth: 2,
  setStrokeWidth: () => {},
  isDrawing: false,
  setIsDrawing: () => {},
  startDrawing: () => {},
  draw: () => {},
  endDrawing: () => {},
  clearCanvas: () => {},
  undo: () => {},
  redo: () => {},
  history: [],
  historyIndex: -1,
  selectedElement: null,
  setSelectedElement: () => {},
  moveElement: () => {},
  resizeElement: () => {},
  currentElement: null,
  textInput: "",
  setTextInput: () => {},
  isEditingText: false,
  setIsEditingText: () => {},
  textPosition: null,
  setTextPosition: () => {},
  finishTextEditing: () => {},
  deleteSelectedElement: () => {},
})

export function WhiteboardProvider({ children }: { children: React.ReactNode }) {
  const [currentWhiteboard, setCurrentWhiteboard] = useState<Whiteboard | null>(null)
  const [elements, setElements] = useState<DrawElement[]>([])
  const [tool, setTool] = useState<Tool>("pencil")
  const [strokeColor, setStrokeColor] = useState<string>("#000000")
  const [strokeWidth, setStrokeWidth] = useState<number>(2)
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [history, setHistory] = useState<DrawElement[][]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [currentElement, setCurrentElement] = useState<DrawElement | null>(null)
  const [selectedElement, setSelectedElement] = useState<DrawElement | null>(null)
  const [textInput, setTextInput] = useState<string>("")
  const [isEditingText, setIsEditingText] = useState<boolean>(false)
  const [textPosition, setTextPosition] = useState<Point | null>(null)

  // Add to history when elements change
  const addToHistory = useCallback(
    (newElements: DrawElement[]) => {
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push([...newElements])
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    },
    [history, historyIndex],
  )

  const startDrawing = useCallback(
    (point: Point) => {
      if (tool === "select" || tool === "hand") {
        // Check if we're clicking on an element
        const clickedElement = elements.findLast((el) => isPointInElement(point, el))
        setSelectedElement(clickedElement || null)
        return
      }

      if (tool === "text") {
        setTextPosition(point)
        setIsEditingText(true)
        setTextInput("")
        return
      }

      const id = uuidv4()
      const newElement: DrawElement = {
        id,
        type: tool as any,
        points: [point],
        strokeColor,
        strokeWidth,
      }

      setCurrentElement(newElement)
      setIsDrawing(true)
    },
    [tool, strokeColor, strokeWidth, elements],
  )

  const draw = useCallback(
    (point: Point) => {
      if (!isDrawing || !currentElement) return

      const updatedElement = { ...currentElement }

      if (tool === "pencil") {
        updatedElement.points = [...updatedElement.points, point]
      } else if (["line", "rectangle", "diamond", "ellipse", "arrow"].includes(tool)) {
        updatedElement.points = [updatedElement.points[0], point]
      }

      setCurrentElement(updatedElement)
    },
    [isDrawing, currentElement, tool],
  )

  const endDrawing = useCallback(() => {
    if (!isDrawing || !currentElement) return

    // Add the current element to elements
    const updatedElements = [...elements, currentElement]
    setElements(updatedElements)
    addToHistory(updatedElements)

    setCurrentElement(null)
    setIsDrawing(false)
  }, [isDrawing, currentElement, elements, addToHistory])

  const clearCanvas = useCallback(() => {
    // Add current state to history before clearing
    if (elements.length > 0) {
      addToHistory([])
    }
    setElements([])
    setSelectedElement(null)

    toast({
      title: "Canvas cleared",
      description: "All elements have been removed from the canvas",
    })
  }, [elements, addToHistory])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setElements(history[historyIndex - 1])
      setSelectedElement(null)

      toast({
        title: "Undo",
        description: "Previous action has been undone",
      })
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setElements(history[historyIndex + 1])
      setSelectedElement(null)

      toast({
        title: "Redo",
        description: "Action has been redone",
      })
    }
  }, [history, historyIndex])

  const isPointInElement = (point: Point, element: DrawElement): boolean => {
    if (element.type === "pencil") {
      // For pencil, check if point is close to any point in the path
      return element.points.some((p) => Math.sqrt(Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2)) < 10)
    } else if (element.type === "line" || element.type === "arrow") {
      // For line, check if point is close to the line
      if (element.points.length < 2) return false
      const [p1, p2] = element.points
      const distance = distancePointToLine(point, p1, p2)
      return distance < 10
    } else if (element.type === "rectangle") {
      // For rectangle, check if point is inside
      if (element.points.length < 2) return false
      const [p1, p2] = element.points
      return (
        point.x >= Math.min(p1.x, p2.x) &&
        point.x <= Math.max(p1.x, p2.x) &&
        point.y >= Math.min(p1.y, p2.y) &&
        point.y <= Math.max(p1.y, p2.y)
      )
    } else if (element.type === "diamond") {
      // For diamond, check if point is inside
      if (element.points.length < 2) return false
      const [p1, p2] = element.points
      const centerX = (p1.x + p2.x) / 2
      const centerY = (p1.y + p2.y) / 2
      const halfWidth = Math.abs(p2.x - p1.x) / 2
      const halfHeight = Math.abs(p2.y - p1.y) / 2

      // Diamond equation: |x - centerX|/halfWidth + |y - centerY|/halfHeight <= 1
      return Math.abs(point.x - centerX) / halfWidth + Math.abs(point.y - centerY) / halfHeight <= 1
    } else if (element.type === "ellipse") {
      // For ellipse, check if point is inside
      if (element.points.length < 2) return false
      const [p1, p2] = element.points
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
      return Math.abs(point.x - element.position.x) < 50 && Math.abs(point.y - element.position.y) < 20
    }
    return false
  }

  const distancePointToLine = (point: Point, line1: Point, line2: Point): number => {
    const A = point.x - line1.x
    const B = point.y - line1.y
    const C = line2.x - line1.x
    const D = line2.y - line1.y

    const dot = A * C + B * D
    const len_sq = C * C + D * D
    let param = -1
    if (len_sq !== 0) {
      //in case of 0 length line
      param = dot / len_sq
    }

    let xx, yy

    if (param < 0) {
      xx = line1.x
      yy = line1.y
    } else if (param > 1) {
      xx = line2.x
      yy = line2.y
    } else {
      xx = line1.x + param * C
      yy = line1.y + param * D
    }

    return Math.sqrt(Math.pow(point.x - xx, 2) + Math.pow(point.y - yy, 2))
  }

  const moveElement = useCallback(
    (id: string, dx: number, dy: number) => {
      setElements((prevElements) => {
        const newElements = prevElements.map((element) => {
          if (element.id === id) {
            if (element.type === "text") {
              return {
                ...element,
                position: {
                  x: element.position ? element.position.x + dx : dx,
                  y: element.position ? element.position.y + dy : dy,
                },
              }
            }
            return {
              ...element,
              points: element.points.map((point) => ({
                x: point.x + dx,
                y: point.y + dy,
              })),
            }
          }
          return element
        })
        return newElements
      })
    },
    [setElements],
  )

  const resizeElement = useCallback(
    (id: string, newPoints: Point[]) => {
      setElements((prevElements) =>
        prevElements.map((element) => {
          if (element.id === id) {
            return { ...element, points: newPoints }
          }
          return element
        }),
      )
    },
    [setElements],
  )

  const finishTextEditing = useCallback(() => {
    if (isEditingText && textPosition && textInput.trim()) {
      const id = uuidv4()
      const newElement: DrawElement = {
        id,
        type: "text",
        points: [],
        strokeColor,
        strokeWidth,
        text: textInput,
        position: textPosition,
      }
      const updatedElements = [...elements, newElement]
      setElements(updatedElements)
      addToHistory(updatedElements)

      toast({
        title: "Text added",
        description: "Text element has been added to the canvas",
      })
    }
    setIsEditingText(false)
    setTextPosition(null)
    setTextInput("")
  }, [isEditingText, textPosition, textInput, strokeColor, strokeWidth, elements, addToHistory])

  const deleteSelectedElement = useCallback(() => {
    if (selectedElement) {
      const updatedElements = elements.filter((element) => element.id !== selectedElement.id)
      setElements(updatedElements)
      addToHistory(updatedElements)
      setSelectedElement(null)
      toast({
        title: "Element deleted",
        description: "The selected element has been removed from the canvas",
      })
    }
  }, [elements, selectedElement, addToHistory])

  const value = {
    currentWhiteboard,
    setCurrentWhiteboard,
    elements,
    setElements,
    tool,
    setTool,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    isDrawing,
    setIsDrawing,
    startDrawing,
    draw,
    endDrawing,
    clearCanvas,
    undo,
    redo,
    history,
    historyIndex,
    selectedElement,
    setSelectedElement,
    moveElement,
    resizeElement,
    currentElement,
    textInput,
    setTextInput,
    isEditingText,
    setIsEditingText,
    textPosition,
    setTextPosition,
    finishTextEditing,
    deleteSelectedElement,
  }

  return <WhiteboardContext.Provider value={value}>{children}</WhiteboardContext.Provider>
}

export const useWhiteboard = () => useContext(WhiteboardContext)
