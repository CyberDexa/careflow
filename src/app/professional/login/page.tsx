"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { loginProfessional, registerProfessional } from "@/actions/professional"
import { Stethoscope } from "lucide-react"

export default function ProfessionalLoginPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await loginProfessional(
        fd.get("email") as string,
        fd.get("password") as string
      )
      if ("error" in result) { toast.error(result.error as string); return }
      router.push("/professional/dashboard")
    })
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await registerProfessional({
        email: fd.get("email") as string,
        password: fd.get("password") as string,
        firstName: fd.get("firstName") as string,
        lastName: fd.get("lastName") as string,
        profession: fd.get("profession") as string,
        gmcNumber: fd.get("gmcNumber") as string,
        phone: fd.get("phone") as string,
      })
      if ("error" in result) { toast.error(result.error as string); return }
      toast.success("Account created. You can now log in.")
    })
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-12 w-12 bg-blue-100 rounded-full mb-3">
          <Stethoscope className="h-6 w-6 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Healthcare Professional Portal</h1>
        <p className="text-sm text-gray-500 mt-1">
          Secure, time-limited access to resident records granted by care homes
        </p>
      </div>

      <Tabs defaultValue="login">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="login" className="flex-1">Log In</TabsTrigger>
          <TabsTrigger value="register" className="flex-1">Create Account</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sign In</CardTitle>
              <CardDescription>Log in to view resident records you have been granted access to.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <Label className="text-xs">Email *</Label>
                  <Input type="email" name="email" required placeholder="you@nhs.net" />
                </div>
                <div>
                  <Label className="text-xs">Password *</Label>
                  <Input type="password" name="password" required />
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Signing in…" : "Sign In"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="register">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Account</CardTitle>
              <CardDescription>
                Register once. Care homes will then be able to grant you access to specific residents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">First Name *</Label>
                    <Input name="firstName" required />
                  </div>
                  <div>
                    <Label className="text-xs">Last Name *</Label>
                    <Input name="lastName" required />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Email *</Label>
                  <Input type="email" name="email" required placeholder="you@nhs.net" />
                </div>
                <div>
                  <Label className="text-xs">Password *</Label>
                  <Input type="password" name="password" required />
                </div>
                <div>
                  <Label className="text-xs">Profession *</Label>
                  <Input name="profession" required placeholder="e.g. GP, District Nurse, Physiotherapist" />
                </div>
                <div>
                  <Label className="text-xs">GMC / NMC Number</Label>
                  <Input name="gmcNumber" placeholder="Optional" />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input name="phone" placeholder="Optional" />
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Creating account…" : "Create Account"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
