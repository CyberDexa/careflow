export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: Brand panel */}
      <div className="hidden lg:flex flex-col bg-primary p-10 text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
            <span className="font-bold text-sm">CF</span>
          </div>
          <span className="text-xl font-semibold">CareFlow</span>
        </div>
        <div className="flex-1 flex flex-col justify-center mt-16">
          <h1 className="text-4xl font-bold leading-tight">
            Person-centred care,<br />beautifully organised.
          </h1>
          <p className="mt-4 text-primary-foreground/75 text-lg leading-relaxed max-w-md">
            CQC and Care Inspectorate-ready care home management. 
            Assessments, care plans, daily notes, and incident reporting — all in one place.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { value: "19", label: "Assessment types" },
              { value: "15", label: "Care plan categories" },
              { value: "100%", label: "CQC aligned" },
              { value: "PWA", label: "Mobile-first" },
            ].map(({ value, label }) => (
              <div key={label} className="bg-primary-foreground/10 rounded-lg p-4">
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-sm text-primary-foreground/70 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-primary-foreground/50">
          © {new Date().getFullYear()} CareFlow. Built for UK care homes.
        </p>
      </div>

      {/* Right: Form panel */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">CF</span>
            </div>
            <span className="font-semibold text-lg">CareFlow</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
