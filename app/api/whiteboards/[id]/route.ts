import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { connectToDatabase } from "@/lib/mongodb"
import { WhiteboardSchema } from "@/types"
import { ObjectId } from "mongodb"
import { authOptions } from "@/lib/auth"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    const userId = session.user.id

    const whiteboard = await db.collection("whiteboards").findOne({ _id: new ObjectId(params.id), userId })

    if (!whiteboard) {
      return NextResponse.json({ error: "Whiteboard not found" }, { status: 404 })
    }

    return NextResponse.json(whiteboard)
  } catch (error) {
    console.error("Error fetching whiteboard:", error)
    return NextResponse.json({ error: "Failed to fetch whiteboard" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validation = WhiteboardSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const userId = session.user.id

    const whiteboard = await db.collection("whiteboards").findOne({ _id: new ObjectId(params.id), userId })

    if (!whiteboard) {
      return NextResponse.json({ error: "Whiteboard not found" }, { status: 404 })
    }

    const updatedWhiteboard = {
      name: body.name,
      elements: body.elements,
      updatedAt: new Date(),
    }

    await db.collection("whiteboards").updateOne({ _id: new ObjectId(params.id) }, { $set: updatedWhiteboard })

    return NextResponse.json({
      id: params.id,
      ...updatedWhiteboard,
      userId,
      createdAt: whiteboard.createdAt,
    })
  } catch (error) {
    console.error("Error updating whiteboard:", error)
    return NextResponse.json({ error: "Failed to update whiteboard" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { db } = await connectToDatabase()
    const userId = session.user.id

    const whiteboard = await db.collection("whiteboards").findOne({ _id: new ObjectId(params.id), userId })

    if (!whiteboard) {
      return NextResponse.json({ error: "Whiteboard not found" }, { status: 404 })
    }

    await db.collection("whiteboards").deleteOne({ _id: new ObjectId(params.id) })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting whiteboard:", error)
    return NextResponse.json({ error: "Failed to delete whiteboard" }, { status: 500 })
  }
}
