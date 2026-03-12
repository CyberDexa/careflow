"use client"

import { useState } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"

interface PhotoStripProps {
  photos: string[]
  className?: string
}

export function PhotoStrip({ photos, className }: PhotoStripProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (!photos || photos.length === 0) return null

  function prev() {
    setLightboxIndex((i) => (i !== null ? (i - 1 + photos.length) % photos.length : 0))
  }

  function next() {
    setLightboxIndex((i) => (i !== null ? (i + 1) % photos.length : 0))
  }

  return (
    <>
      {/* Thumbnail strip */}
      <div className={`flex gap-1.5 flex-wrap ${className ?? ""}`}>
        {photos.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLightboxIndex(i)}
            className="w-14 h-14 rounded overflow-hidden border bg-muted hover:ring-2 hover:ring-ring focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close */}
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/40 rounded-full p-1.5"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Prev */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prev() }}
              className="absolute left-4 text-white/80 hover:text-white bg-black/40 rounded-full p-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {/* Image */}
          <div onClick={(e) => e.stopPropagation()} className="max-w-[90vw] max-h-[85vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[lightboxIndex]}
              alt={`Photo ${lightboxIndex + 1} of ${photos.length}`}
              className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl"
            />
            {photos.length > 1 && (
              <p className="text-white/60 text-xs text-center mt-2">
                {lightboxIndex + 1} / {photos.length}
              </p>
            )}
          </div>

          {/* Next */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); next() }}
              className="absolute right-4 text-white/80 hover:text-white bg-black/40 rounded-full p-2"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
    </>
  )
}
