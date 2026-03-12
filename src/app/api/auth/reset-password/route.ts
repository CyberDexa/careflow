import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password || typeof token !== "string" || typeof password !== "string") {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ message: "Password must be at least 8 characters" }, { status: 400 })
    }

    // Find all non-expired, unused tokens and check against the raw token
    const candidates = await prisma.passwordResetToken.findMany({
      where: {
        used: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    })

    let matched: (typeof candidates)[number] | undefined

    for (const candidate of candidates) {
      const isMatch = await bcrypt.compare(token, candidate.token)
      if (isMatch) {
        matched = candidate
        break
      }
    }

    if (!matched) {
      return NextResponse.json(
        { message: "This reset link is invalid or has expired. Please request a new one." },
        { status: 400 }
      )
    }

    const newPasswordHash = await bcrypt.hash(password, 12)

    // Update password and mark token as used in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: matched.userId },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: matched.id },
        data: { used: true },
      }),
    ])

    return NextResponse.json({ message: "Password reset successfully" })
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
