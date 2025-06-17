"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play, Download, Loader2, CheckCircle, XCircle, Clock, Video, Settings, Zap, FileText } from "lucide-react"

interface LogEntry {
  id: string
  timestamp: string
  type: "info" | "success" | "error" | "warning"
  message: string
}

interface VideoStatus {
  status: "idle" | "generating" | "processing" | "completed" | "failed"
  videoId?: string
  videoUrl?: string
  progress: number
  error?: string
}

export default function VideoGenerator() {
  const [prompt, setPrompt] = useState("Create an engaging introduction video for my business!")
  const [videoStatus, setVideoStatus] = useState<VideoStatus>({
    status: "idle",
    progress: 0,
  })
  const [logs, setLogs] = useState<LogEntry[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)

  const addLog = (type: LogEntry["type"], message: string) => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    }
    setLogs((prev) => [newLog, ...prev])
  }

  const generateVideo = async () => {
    if (!prompt.trim()) {
      addLog("error", "Please enter a prompt")
      return
    }

    if (prompt.length > 1500) {
      addLog("error", "Prompt must be less than 1500 characters")
      return
    }

    setVideoStatus({ status: "generating", progress: 10 })
    addLog("info", "Starting video generation...")

    const payload = {
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: "Abigail_sitting_sofa_front",
            avatar_style: "normal",
          },
          voice: {
            type: "text",
            input_text: prompt,
            voice_id: "119caed25533477ba63822d5d1552d25",
            speed: 1.0,
          },
          background: { type: "color", value: "#FFFFFF" },
        },
      ],
      dimension: { width: 720, height: 720 },
    }

    try {
      addLog("info", "Sending request to HeyGen API...")
      const genRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const genData = await genRes.json()

      if (!genRes.ok || !genData.data?.video_id) {
        throw new Error(genData.error?.message || "Failed to generate video")
      }

      const videoId = genData.data.video_id
      setVideoStatus({ status: "processing", progress: 30, videoId })
      addLog("success", `Video generation started! ID: ${videoId}`)

      // Poll for status
      await pollVideoStatus(videoId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setVideoStatus({ status: "failed", progress: 0, error: errorMessage })
      addLog("error", `Generation failed: ${errorMessage}`)
    }
  }

  const pollVideoStatus = async (videoId: string) => {
    let attempts = 0
    const maxAttempts = 100

    while (attempts < maxAttempts) {
      try {
        addLog("info", `Checking video status... (Attempt ${attempts + 1}/${maxAttempts})`)

        const statusRes = await fetch(`/api/status/${videoId}`)
        const statusData = await statusRes.json()

        if (!statusRes.ok) {
          throw new Error(statusData.error?.message || "Failed to check status")
        }

        const status = statusData.data?.status
        const progress = Math.min(30 + attempts * 2, 90)

        if (status === "completed") {
          const videoUrl = statusData.data?.video_url || statusData.data?.output?.video_url
          if (!videoUrl) {
            throw new Error("Video URL not found in response")
          }

          setVideoStatus({
            status: "completed",
            progress: 100,
            videoId,
            videoUrl,
          })
          addLog("success", "Video generation completed successfully!")
          return
        } else if (status === "failed") {
          throw new Error(statusData.data?.error?.message || "Video generation failed")
        } else {
          setVideoStatus((prev) => ({ ...prev, progress }))
          addLog("info", `Status: ${status || "processing"}...`)
          await new Promise((resolve) => setTimeout(resolve, 3000))
          attempts++
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Status check failed"
        setVideoStatus({ status: "failed", progress: 0, error: errorMessage })
        addLog("error", errorMessage)
        return
      }
    }

    setVideoStatus({ status: "failed", progress: 0, error: "Video generation timed out" })
    addLog("error", "Video generation timed out after maximum attempts")
  }

  const downloadVideo = async () => {
    if (!videoStatus.videoUrl) return

    try {
      addLog("info", "Starting video download...")
      const response = await fetch(videoStatus.videoUrl)
      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `heygen-video-${videoStatus.videoId || Date.now()}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      addLog("success", "Video downloaded successfully!")
    } catch (error) {
      addLog("error", "Failed to download video")
    }
  }

  const resetGenerator = () => {
    setVideoStatus({ status: "idle", progress: 0 })
    setLogs([])
    if (videoRef.current) {
      videoRef.current.src = ""
    }
  }

  const getStatusIcon = () => {
    switch (videoStatus.status) {
      case "generating":
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Video className="h-4 w-4" />
    }
  }

  const getStatusColor = () => {
    switch (videoStatus.status) {
      case "generating":
      case "processing":
        return "bg-blue-500"
      case "completed":
        return "bg-green-500"
      case "failed":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            HeyGen Video Generator
          </h1>
          <p className="text-slate-600 text-lg">
            Create professional AI-generated videos with advanced avatars and voices
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Video Prompt
                </CardTitle>
                <CardDescription>Enter your script or description for the AI avatar to speak</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Enter your video script here... (max 1500 characters)"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={6}
                    className="resize-none"
                  />
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Characters: {prompt.length}/1500</span>
                    <Badge variant={prompt.length > 1500 ? "destructive" : "secondary"}>
                      {prompt.length > 1500 ? "Too long" : "Valid"}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={generateVideo}
                    disabled={videoStatus.status === "generating" || videoStatus.status === "processing"}
                    className="flex-1"
                    size="lg"
                  >
                    {videoStatus.status === "generating" || videoStatus.status === "processing" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        Generate Video
                      </>
                    )}
                  </Button>

                  <Button onClick={resetGenerator} variant="outline" size="lg">
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Video Player */}
            {videoStatus.videoUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Play className="h-5 w-5" />
                      Generated Video
                    </span>
                    <Button onClick={downloadVideo} variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <video
                    ref={videoRef}
                    src={videoStatus.videoUrl}
                    controls
                    className="w-full rounded-lg shadow-lg"
                    style={{ maxHeight: "500px" }}
                  />
                  <p className="text-sm text-slate-500 mt-2">
                    ⚠️ Video URL expires in 7 days. Download to save permanently.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Status & Logs Section */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon()}
                  Generation Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{videoStatus.progress}%</span>
                  </div>
                  <Progress value={videoStatus.progress} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                    <span className="font-medium capitalize">{videoStatus.status.replace("_", " ")}</span>
                  </div>

                  {videoStatus.videoId && <p className="text-xs text-slate-500 font-mono">ID: {videoStatus.videoId}</p>}

                  {videoStatus.error && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>{videoStatus.error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Configuration Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Current Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Avatar:</span>
                    <Badge variant="outline">Abigail</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Voice:</span>
                    <Badge variant="outline">Female</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Resolution:</span>
                    <Badge variant="outline">720x720</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Speed:</span>
                    <Badge variant="outline">1.0x</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logs Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Activity Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {logs.length === 0 ? (
                      <p className="text-slate-500 text-sm text-center py-4">
                        No activity yet. Start generating a video to see logs.
                      </p>
                    ) : (
                      logs.map((log) => (
                        <div key={log.id} className="flex gap-2 text-xs">
                          <span className="text-slate-400 font-mono min-w-[60px]">{log.timestamp}</span>
                          <Badge
                            variant={
                              log.type === "error"
                                ? "destructive"
                                : log.type === "success"
                                  ? "default"
                                  : log.type === "warning"
                                    ? "secondary"
                                    : "outline"
                            }
                            className="text-xs px-1 py-0 min-w-[50px] justify-center"
                          >
                            {log.type.toUpperCase()}
                          </Badge>
                          <span className="text-slate-700 flex-1">{log.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
