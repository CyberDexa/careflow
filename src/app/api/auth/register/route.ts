import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { registerSchema } from "@/lib/validations"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { organisationName, firstName, lastName, email, password, regulatoryBody } = parsed.data

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ message: "An account with this email already exists" }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    // Create org + admin user in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const org = await tx.organisation.create({
        data: {
          name: organisationName,
          regulatoryBody: regulatoryBody as any,
        },
      })

      const user = await tx.user.create({
        data: {
          organisationId: org.id,
          email,
          passwordHash,
          firstName,
          lastName,
          role: "MANAGER",
        },
      })

      return { org, user }
    })

    return NextResponse.json(
      { message: "Account created", organisationId: result.org.id },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
