import { NextResponse } from "next/server"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ message: "Email is required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    // Always return 200 — do not confirm whether the email exists
    if (!user || !user.isActive || user.deletedAt) {
      return NextResponse.json({ message: "If an account exists, a reset link has been sent." })
    }

    // Invalidate any existing tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    })

    // Generate a cryptographically secure token
    const rawToken = crypto.randomBytes(32).toString("hex")
    const hashedToken = await bcrypt.hash(rawToken, 10)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
      },
    })

    // In production, send via email. For now, log the reset URL server-side.
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${rawToken}`
    console.info(`[Password Reset] User ${user.email} — reset URL: ${resetUrl}`)

    return NextResponse.json({ message: "If an account exists, a reset link has been sent." })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
