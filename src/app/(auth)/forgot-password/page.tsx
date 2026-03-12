"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/ui/form-field"
import { Loader2, CheckCircle2 } from "lucide-react"

const schema = z.object({
  email: z.string().email("Invalid email address"),
})
type FormInput = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormInput) {
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    // Always show success — do not confirm whether the email exists
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div>
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold">Check your email</h2>
          <p className="text-muted-foreground mt-2 max-w-sm">
            If an account with that email exists, we&apos;ve sent a password reset link.
            The link will expire in 1 hour.
          </p>
          <p className="text-muted-foreground mt-3 text-sm">
            Didn&apos;t receive it? Check your spam folder or contact your CareFlow administrator.
          </p>
        </div>
        <Link href="/login" className="block">
          <Button variant="outline" className="w-full">
            Back to sign in
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Reset your password</h2>
        <p className="text-muted-foreground mt-1">
          Enter your email address and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Email address" error={errors.email?.message} required>
          <Input
            {...register("email")}
            type="email"
            placeholder="you@carehome.co.uk"
            autoComplete="email"
            autoFocus
          />
        </FormField>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
