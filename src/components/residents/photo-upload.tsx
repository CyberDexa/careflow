"use client"

import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { Camera, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { updateResidentPhoto } from "@/actions/residents"

interface Props {
  residentId: string
  photoUrl?: string | null
  firstName: string
  lastName: string
  initials: string
}

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 400
      let { width, height } = img
      if (width > height) {
        if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX }
      } else {
        if (height > MAX) { width = Math.round((width * MAX) / height); height = MAX }
      }
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL("image/jpeg", 0.85))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")) }
    img.src = url
  })
}

export function ResidentPhotoUpload({ residentId, photoUrl, firstName, lastName, initials: initStr }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    try {
      const compressed = await compressImage(file)
      setPreview(compressed)

      startTransition(async () => {
        const result = await updateResidentPhoto(residentId, compressed)
        if (result && "error" in result) {
          toast.error(result.error)
          setPreview(null)
        } else {
          toast.success("Photo updated")
        }
      })
    } catch {
      toast.error("Failed to process image")
    }
  }

  const displayPhoto = preview ?? photoUrl

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="group relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Change profile photo"
      >
        <Avatar className="h-16 w-16 shrink-0">
          {displayPhoto && <AvatarImage src={displayPhoto} alt={firstName} />}
          <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
            {initStr}
          </AvatarFallback>
        </Avatar>
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 group-hover:bg-black/40 transition-colors">
          {isPending ? (
            <Loader2 className="h-5 w-5 text-white animate-spin opacity-100" />
          ) : (
            <Camera className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden="true"
        onChange={handleFile}
      />
    </div>
  )
}
