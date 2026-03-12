import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const familyLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const {
  handlers: familyHandlers,
  auth: familyAuth,
  signIn: familySignIn,
  signOut: familySignOut,
} = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/family/login",
    error: "/family/login",
  },
  providers: [
    Credentials({
      id: "family-credentials",
      name: "Family Portal",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = familyLoginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const familyUser = await prisma.familyUser.findUnique({
          where: { email: parsed.data.email },
          include: {
            resident: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                organisationId: true,
              },
            },
          },
        })

        if (!familyUser || !familyUser.isActive || familyUser.deletedAt) return null
        if (!familyUser.passwordHash) return null // invite not yet accepted
        if (!familyUser.inviteAcceptedAt) return null

        const valid = await bcrypt.compare(parsed.data.password, familyUser.passwordHash)
        if (!valid) return null

        await prisma.familyUser.update({
          where: { id: familyUser.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: familyUser.id,
          email: familyUser.email,
          name: `${familyUser.firstName} ${familyUser.lastName}`,
          familyUserId: familyUser.id,
          residentId: familyUser.residentId,
          organisationId: familyUser.organisationId,
          relationship: familyUser.relationship,
          residentFirstName: familyUser.resident.firstName,
          residentLastName: familyUser.resident.lastName,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.familyUserId = (user as any).familyUserId
        token.residentId = (user as any).residentId
        token.organisationId = (user as any).organisationId
        token.relationship = (user as any).relationship
        token.residentFirstName = (user as any).residentFirstName
        token.residentLastName = (user as any).residentLastName
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).familyUserId = token.familyUserId
        ;(session.user as any).residentId = token.residentId
        ;(session.user as any).organisationId = token.organisationId
        ;(session.user as any).relationship = token.relationship
        ;(session.user as any).residentFirstName = token.residentFirstName
        ;(session.user as any).residentLastName = token.residentLastName
      }
      return session
    },
  },
})
