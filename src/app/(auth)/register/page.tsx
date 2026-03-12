"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormField } from "@/components/ui/form-field"
import { registerClientSchema, type RegisterClientInput } from "@/lib/validations"
import { Eye, EyeOff, Loader2 } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterClientInput>({
    resolver: zodResolver(registerClientSchema) as any,
    defaultValues: { regulatoryBody: "CQC" },
  })

  async function onSubmit(data: RegisterClientInput) {
    const { confirmPassword: _, ...payload } = data
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const error = await res.json()
      toast.error(error.message || "Registration failed")
      return
    }

    toast.success("Account created! Please sign in.")
    router.push("/login")
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Register your care home</h2>
        <p className="text-muted-foreground mt-1">Set up your organisation account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Care home / Organisation name" error={errors.organisationName?.message} required>
          <Input {...register("organisationName")} placeholder="Sunrise Care Home" />
        </FormField>

        <FormField label="Regulatory body" required>
          <Select onValueChange={(v) => setValue("regulatoryBody", v as any)} defaultValue="CQC">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CQC">CQC (England)</SelectItem>
              <SelectItem value="CARE_INSPECTORATE">Care Inspectorate (Scotland)</SelectItem>
              <SelectItem value="CSSIW">CIW (Wales)</SelectItem>
              <SelectItem value="RQIA">RQIA (Northern Ireland)</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="First name" error={errors.firstName?.message} required>
            <Input {...register("firstName")} placeholder="Sarah" autoComplete="given-name" />
          </FormField>
          <FormField label="Last name" error={errors.lastName?.message} required>
            <Input {...register("lastName")} placeholder="Johnson" autoComplete="family-name" />
          </FormField>
        </div>

        <FormField label="Email address" error={errors.email?.message} required>
          <Input {...register("email")} type="email" placeholder="manager@carehome.co.uk" autoComplete="email" />
        </FormField>

        <FormField
          label="Password"
          error={errors.password?.message}
          hint="Minimum 8 characters"
          required
        >
          <div className="relative">
            <Input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </FormField>

        <FormField
          label="Confirm password"
          error={errors.confirmPassword?.message}
          required
        >
          <div className="relative">
            <Input
              {...register("confirmPassword")}
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </FormField>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
