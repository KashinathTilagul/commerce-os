'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GlassPanel } from '@/components/ui/glass-system'
import { FileText, Upload, Download, Trash2, Loader2, Eye, X, FileType, ImageIcon, FileCode, FileAudio, FileVideo, FileSpreadsheet, FileJson } from 'lucide-react'
import { toast } from '@/components/ekvaar/desktop/toast'

interface Artifact {
  id: string
  title: string
  type: string
  mimeType: string
  size: number
  createdAt: string
  storageLocation?: string
}

export function ReferencesTab({ agent }: { agent: any }) {
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const { data: artifacts = [], isLoading, refetch } = useQuery<Artifact[]>({
    queryKey: ['agent-references', agent.id],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${agent.id}/references`)
      if (!res.ok) return []
      const data = await res.json()
      return data.artifacts || []
    },
    refetchInterval: 30000,
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('agentId', agent.id)
      const res = await fetch(`/api/agents/${agent.id}/references`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Upload failed')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Reference file uploaded')
      refetch()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Upload failed')
    },
    onSettled: () => setUploading(false),
  })

  const deleteMutation = useMutation({
    mutationFn: async (artifactId: string) => {
      const res = await fetch(`/api/artifacts/${artifactId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
    },
    onSuccess: () => {
      toast.success('Reference removed')
      refetch()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Delete failed')
    },
  })

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    e.target.value = ''
  }

  const handleUpload = (file: File) => {
    setUploading(true)
    uploadMutation.mutate(file)
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-emerald-400" />
    if (mimeType === 'application/pdf') return <FileText className="h-5 w-5 text-red-400" />
    if (mimeType.startsWith('text/') || mimeType === 'application/json') return <FileCode className="h-5 w-5 text-cyan-400" />
    if (mimeType.startsWith('audio/')) return <FileAudio className="h-5 w-5 text-amber-400" />
    if (mimeType.startsWith('video/')) return <FileVideo className="h-5 w-5 text-purple-400" />
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-green-400" />
    return <FileText className="h-5 w-5 text-muted-foreground" />
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleDownload = async (artifact: Artifact) => {
    try {
      const res = await fetch(`/api/artifacts/${artifact.id}`)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = artifact.title
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Download failed')
    }
  }

  const handlePreview = (artifact: Artifact) => {
    window.open(`/api/artifacts/${artifact.id}`, '_blank')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base tracking-tight">Reference Files</h2>
          <p className="text-[11px] text-muted-foreground">
            Upload documents, images, or data files for this agent to reference during work
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <GlassPanel level={2} className={`rounded-xl p-6 transition-colors ${
        dragActive ? 'border-cyan-300/30 bg-cyan-300/[0.04]' : 'border-white/[0.06]'
      }`}>
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileSelect}
          accept=".pdf,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xlsx"
        />
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragActive ? 'border-cyan-300/50 bg-cyan-300/[0.04]' : 'border-white/[0.1] hover:border-cyan-300/20'
          }`}
          onDragEnter={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={(e) => { e.preventDefault(); setDragActive(false) }}
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <Upload className="mx-auto h-8 w-8 text-muted-foreground/60 mb-3" />
          <div className="text-[13px] font-medium">Drop reference files here or click to browse</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            PDF, TXT, MD, CSV, JSON, PNG, JPG, GIF, WebP, DOC, DOCX, XLSX (max 25MB)
          </div>
          {uploading && <Loader2 className="mx-auto h-5 w-5 animate-spin text-cyan-300 mt-3" />}
        </div>
      </GlassPanel>

      {/* File List */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : artifacts.length === 0 ? (
        <GlassPanel level={2} className="rounded-xl p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
          <div className="text-[13px] text-muted-foreground">No reference files yet</div>
          <div className="mt-1 text-[11px] text-muted-foreground/60">Upload files above for this agent to reference</div>
        </GlassPanel>
      ) : (
        <GlassPanel level={2} className="rounded-xl p-0 overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-3">
            <div className="text-[10px] font-medium tracking-[0.12em] uppercase text-muted-foreground">
              {artifacts.length} reference file{artifacts.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {artifacts.map((artifact) => (
              <div key={artifact.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                    {getFileIcon(artifact.mimeType)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{artifact.title}</div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                      <span>{artifact.type}</span>
                      <span>{formatSize(artifact.size)}</span>
                      <span>{new Date(artifact.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handlePreview(artifact)}
                    className="glass-l2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-colors"
                    title="Preview"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDownload(artifact)}
                    className="glass-l2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-colors"
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(artifact.id)}
                    disabled={deleteMutation.isPending}
                    className="glass-l2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/[0.08] transition-colors disabled:opacity-40"
                    title="Remove"
                  >
                    {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  )
}