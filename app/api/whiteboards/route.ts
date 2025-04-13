import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { connectToDatabase } from "@/lib/mongodb"
import { WhiteboardSchema } from "@/types"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    const userId = session.user.id

    const whiteboards = await db.collection("whiteboards").find({ userId }).sort({ updatedAt: -1 }).toArray()

    return NextResponse.json(whiteboards)
  } catch (error) {
    console.error("Error fetching whiteboards:", error)
    return NextResponse.json({ error: "Failed to fetch whiteboards" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      console.error("Unauthorized: User ID is missing from session", session)
      return NextResponse.json({ error: "Unauthorized - Missing user ID" }, { status: 401 })
    }

    const body = await req.json()
    const validation = WhiteboardSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const userId = session.user.id

    console.log("Creating whiteboard with userId:", userId)

    const whiteboard = {
      name: body.name,
      userId,
      elements: body.elements,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("whiteboards").insertOne(whiteboard)

    return NextResponse.json({
      id: result.insertedId,
      ...whiteboard,
    })
  } catch (error) {
    console.error("Error creating whiteboard:", error)
    return NextResponse.json({ error: "Failed to create whiteboard" }, { status: 500 })
  }
}
