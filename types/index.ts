import { z } from "zod"

export type User = {
  id: string
  name: string
  email: string
  image?: string
}

export type Point = {
  x: number
  y: number
}

export type DrawElement = {
  id: string
  type: "pencil" | "line" | "rectangle" | "diamond" | "ellipse" | "arrow" | "text"
  points: Point[]
  strokeColor: string
  strokeWidth: number
  text?: string
  position?: Point
  fontSize?: number
}

export type Whiteboard = {
  id: string
  name: string
  userId: string
  elements: DrawElement[]
  createdAt: Date
  updatedAt: Date
}

export const WhiteboardSchema = z.object({
  name: z.string().min(1, "Name is required"),
  elements: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["pencil", "line", "rectangle", "diamond", "ellipse", "arrow", "text"]),
      points: z.array(z.object({ x: z.number(), y: z.number() })),
      strokeColor: z.string(),
      strokeWidth: z.number(),
      text: z.string().optional(),
      position: z.object({ x: z.number(), y: z.number() }).optional(),
      fontSize: z.number().optional(),
    }),
  ),
})

export const UserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})
