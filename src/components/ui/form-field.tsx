import * as React from "react"
import { cn } from "@/lib/utils"

// Simple form field wrapper with label + error
interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
  error?: string
  required?: boolean
  hint?: string
}

export function FormField({ label, error, required, hint, className, children, ...props }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      {label && (
        <label className="text-sm font-medium leading-none text-foreground">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// Form section header
export function FormSection({ title, description, className, children }: {
  title: string
  description?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="border-b pb-3">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

// Step indicator for multi-step forms
export function StepIndicator({ steps, currentStep }: {
  steps: string[]
  currentStep: number
}) {
  return (
    <nav aria-label="Form steps" className="flex items-center gap-2 overflow-x-auto pb-1">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                index < currentStep
                  ? "bg-primary text-primary-foreground"
                  : index === currentStep
                  ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {index < currentStep ? "✓" : index + 1}
            </div>
            <span
              className={cn(
                "text-sm font-medium hidden sm:block",
                index === currentStep ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={cn("h-px flex-1 min-w-[20px]", index < currentStep ? "bg-primary" : "bg-border")} />
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
