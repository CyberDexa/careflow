import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "@/app/globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "CareFlow — Healthcare Professional Portal",
  description: "Secure access portal for GPs and healthcare professionals",
}

export default function ProfessionalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={inter.className}>
      <div className="min-h-screen bg-gray-50">
        {/* Portal header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-blue-700">CareFlow</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                Healthcare Professional Portal
              </span>
            </div>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </div>
    </div>
  )
}
