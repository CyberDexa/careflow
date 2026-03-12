"use client"

import { useState, useTransition, useRef, useCallback } from "react"
import { Plus, Loader2, Camera, X, ImagePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { addBodyMapEntry } from "@/actions/body-map"
import { toast } from "sonner"

// Compress an image file to a JPEG base64 data URL (<= maxSizeKB)
function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width)
        const canvas = document.createElement("canvas")
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL("image/jpeg", quality))
      }
      img.onerror = reject
      img.src = e.target!.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const BODY_REGIONS = [
  "head", "neck",
  "chest-left", "chest-right", "abdomen-upper", "abdomen-lower",
  "shoulder-left", "shoulder-right",
  "upper-arm-left", "upper-arm-right",
  "elbow-left", "elbow-right",
  "forearm-left", "forearm-right",
  "wrist-left", "wrist-right",
  "hand-left", "hand-right",
  "hip-left", "hip-right", "sacrum",
  "thigh-left", "thigh-right",
  "knee-left", "knee-right",
  "shin-left", "shin-right",
  "ankle-left", "ankle-right",
  "foot-left", "foot-right",
  "back-upper", "back-lower",
]

const ENTRY_TYPES = [
  { value: "SKIN_TEAR", label: "Skin Tear" },
  { value: "PRESSURE_DAMAGE", label: "Pressure Damage" },
  { value: "WOUND", label: "Wound" },
  { value: "BRUISE", label: "Bruise" },
  { value: "RASH", label: "Rash" },
  { value: "SWELLING", label: "Swelling" },
  { value: "NEW_MARK", label: "New Mark" },
  { value: "OTHER", label: "Other" },
]

const SEVERITIES = [
  { value: "MINOR", label: "Minor" },
  { value: "MODERATE", label: "Moderate" },
  { value: "SEVERE", label: "Severe" },
]

export function BodyMapHistoryClient({ residentId }: { residentId: string }) {
  const [open, setOpen] = useState(false)
  const [region, setRegion] = useState("")
  const [type, setType] = useState("")
  const [severity, setSeverity] = useState("")
  const [description, setDescription] = useState("")
  const [photos, setPhotos] = useState<string[]>([])
  const [compressing, setCompressing] = useState(false)
  const [pending, startTransition] = useTransition()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (photos.length + files.length > 4) {
      toast.error("Maximum 4 photos per entry")
      return
    }
    setCompressing(true)
    try {
      const newPhotos = await Promise.all(
        Array.from(files).map((f) => compressImage(f))
      )
      setPhotos((prev) => [...prev, ...newPhotos])
    } catch {
      toast.error("Could not process image")
    } finally {
      setCompressing(false)
    }
  }, [photos.length])

  function handleSubmit() {
    if (!region || !type || !severity || !description.trim()) {
      toast.error("Please fill in all fields")
      return
    }
    startTransition(async () => {
      const result = await addBodyMapEntry({
        residentId,
        bodyRegion: region,
        type: type as any,
        severity: severity as any,
        description,
        photoUrls: photos,
      })
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Body map entry added")
        setOpen(false)
        setRegion("")
        setType("")
        setSeverity("")
        setDescription("")
        setPhotos([])
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record body map entry</DialogTitle>
          <DialogDescription>
            Record a new injury, skin change, or observation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Body region</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger>
                <SelectValue placeholder="Select region..." />
              </SelectTrigger>
              <SelectContent>
                {BODY_REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Type..." />
                </SelectTrigger>
                <SelectContent>
                  {ENTRY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue placeholder="Severity..." />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description / observations</Label>
            <Textarea
              placeholder="Describe the injury or observation in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Photo capture / upload */}
          <div className="space-y-1.5">
            <Label>Photos <span className="text-muted-foreground font-normal">(optional, max 4)</span></Label>
            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
              onClick={(e) => { (e.target as HTMLInputElement).value = "" }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
              onClick={(e) => { (e.target as HTMLInputElement).value = "" }}
            />

            {/* Thumbnails */}
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {photos.map((src, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                      className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add buttons */}
            {photos.length < 4 && (
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={compressing}
                  onClick={() => cameraInputRef.current?.click()}
                  className="text-xs"
                >
                  {compressing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Camera className="h-3.5 w-3.5 mr-1" />}
                  Camera
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={compressing}
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs"
                >
                  {compressing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <ImagePlus className="h-3.5 w-3.5 mr-1" />}
                  Upload
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending || compressing}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
