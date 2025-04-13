import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { UserSchema } from "@/types"
import * as crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validation = UserSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({ email: body.email })

    if (existingUser) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 })
    }

    // Generate a random salt
    const salt = crypto.randomBytes(16).toString("hex")
    // Hash the password with the salt
    const hashedPassword = crypto.createHmac("sha256", salt).update(body.password).digest("hex")
    // Store both the hash and salt
    const passwordWithSalt = `${hashedPassword}.${salt}`

    // Create user
    const user = {
      name: body.name,
      email: body.email,
      password: passwordWithSalt,
      createdAt: new Date(),
    }

    await db.collection("users").insertOne(user)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error registering user:", error)
    return NextResponse.json({ error: "Failed to register user" }, { status: 500 })
  }
}
