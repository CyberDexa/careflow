"use client"

import { useRef, useState, useCallback } from "react"
import { Mic, MicOff, Square, Loader2, Check, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type VoiceResult = {
  transcription: string
  category: string
  content: string
}

interface VoiceRecorderProps {
  onResult: (result: VoiceResult) => void
  onCancel?: () => void
  className?: string
}

type RecorderState = "idle" | "recording" | "transcribing" | "structuring" | "done" | "error"

export function VoiceRecorder({ onResult, onCancel, className }: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [transcription, setTranscription] = useState("")
  const [seconds, setSeconds] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const drawWaveform = useCallback(() => {
    const analyser = analyserRef.current
    const canvas = canvasRef.current
    if (!analyser || !canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const bufferLength = analyser.fftSize
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw)
      analyser.getByteTimeDomainData(dataArray)
      ctx.fillStyle = "rgb(239 246 255)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.lineWidth = 2
      ctx.strokeStyle = "rgb(37 99 235)"
      ctx.beginPath()
      const sliceWidth = canvas.width / bufferLength
      let x = 0
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * canvas.height) / 2
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        x += sliceWidth
      }
      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.stroke()
    }
    draw()
  }, [])

  const startRecording = async () => {
    setError(null)
    setTranscription("")
    setSeconds(0)
    chunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.start(100)
      setState("recording")
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
      drawWaveform()
    } catch {
      setError("Microphone permission denied. Please allow microphone access.")
      setState("error")
    }
  }

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current
    if (!recorder) return
    if (timerRef.current) clearInterval(timerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" })
      recorder.stream.getTracks().forEach((t) => t.stop())
      await processAudio(blob)
    }
    recorder.stop()
  }

  const processAudio = async (blob: Blob) => {
    setState("transcribing")
    try {
      const fd = new FormData()
      fd.append("audio", blob, "recording.webm")
      const tRes = await fetch("/api/voice/transcribe", { method: "POST", body: fd })
      if (!tRes.ok) throw new Error("Transcription failed")
      const { transcription } = await tRes.json()
      setTranscription(transcription)

      setState("structuring")
      const sRes = await fetch("/api/voice/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcription }),
      })
      if (!sRes.ok) throw new Error("Structuring failed")
      const { category, content } = await sRes.json()
      setState("done")
      onResult({ transcription, category, content })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Processing failed")
      setState("error")
    }
  }

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`

  return (
    <div className={cn("rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3", className)}>
      {state === "idle" && (
        <div className="flex flex-col items-center gap-3 py-2">
          <p className="text-sm text-blue-700 font-medium">Tap to start voice recording</p>
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-3 text-sm font-medium transition-colors"
          >
            <Mic className="h-4 w-4" />
            Start Recording
          </button>
        </div>
      )}

      {state === "recording" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-sm font-medium text-gray-700">Recording {formatTime(seconds)}</span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white rounded-full px-4 py-2 text-sm font-medium transition-colors"
            >
              <Square className="h-3 w-3 fill-current" />
              Stop
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={300}
            height={48}
            className="w-full h-12 rounded-lg"
          />
        </div>
      )}

      {(state === "transcribing" || state === "structuring") && (
        <div className="flex flex-col items-center gap-2 py-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <p className="text-sm text-blue-700 font-medium">
            {state === "transcribing" ? "Transcribing audio…" : "Structuring care note…"}
          </p>
        </div>
      )}

      {state === "done" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-700">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">Note structured from voice</span>
          </div>
          {transcription && (
            <p className="text-xs text-gray-500 italic leading-relaxed line-clamp-2">
              &ldquo;{transcription}&rdquo;
            </p>
          )}
          <button
            type="button"
            onClick={() => setState("idle")}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800"
          >
            <RotateCcw className="h-3 w-3" />
            Record again
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-red-700">
            <MicOff className="h-4 w-4" />
            <span className="text-sm font-medium">{error || "Recording failed"}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setState("idle")}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800"
            >
              <RotateCcw className="h-3 w-3" />
              Try again
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
