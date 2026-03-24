"use client"

import { useState, useEffect, useRef, ChangeEvent } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { X, LogOut, ImageUp, Trash2, User, Mail, FileText, Linkedin, Github, CalendarDays, Clock } from "lucide-react"

interface UserProfile {
  id?: string
  user_id?: string
  avatar_url?: string | null
  bio?: string | null
  company?: string | null
  phone?: string | null
  location?: string | null
  website?: string | null
  linkedin_url?: string | null
  github_url?: string | null
  display_name?: string | null
  email?: string | null
  birth_date?: string | null
}


interface ProfileEditorProps {
  onLogout?: () => void
  onDirtyChange?: (dirty: boolean) => void
}

export default function ProfileEditor({ onLogout, onDirtyChange }: ProfileEditorProps = {}) {
  const [profile, setProfile] = useState<UserProfile>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [authName, setAuthName] = useState<string | null>(null)
  const [savedAuthName, setSavedAuthName] = useState<string | null>(null)
  const [authEmail, setAuthEmail] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [accountCreatedAt, setAccountCreatedAt] = useState<string | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [showPhotoMenu, setShowPhotoMenu] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const savedProfileRef = useRef<UserProfile>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  function getInitials(name?: string) {
    const v = (name || '').trim()
    if (!v) return ''
    const parts = v.split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + (parts[1][0] || '')).toUpperCase()
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: authData } = await supabase.auth.getUser()
        const sessionRes = await supabase.auth.getSession()
        const user = authData?.user
        const session = sessionRes?.data?.session
        if (user) {
          setAuthEmail(user.email || null)
          const name = (user.user_metadata?.display_name as string | undefined) ||
            (user.user_metadata?.name as string | undefined) || null
          setAuthName(name)
          setSavedAuthName(name)
          if (user.created_at) setAccountCreatedAt(user.created_at)
        }
        if (session?.access_token) setToken(session.access_token)

        const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
        const res = await fetch(`${base}/api/profile`, {
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
        })
        if (!res.ok) return
        const data: UserProfile = await res.json()
        if (mounted) {
          setProfile(data || {})
          savedProfileRef.current = data || {}
          // Limpiar preview local cuando cargamos el perfil real
          setFilePreview(null)
          setPendingFile(null)
        }
      } catch {
        // ignore
      }
    })()
    return () => { mounted = false }
  }, [])

  // Dirty tracking
  useEffect(() => {
    const dirty = pendingFile !== null ||
      JSON.stringify(profile) !== JSON.stringify(savedProfileRef.current) ||
      authName !== savedAuthName
    onDirtyChange?.(dirty)
  }, [profile, pendingFile, authName, savedAuthName, onDirtyChange])

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    // Solo crear preview local, no subir todavía
    setFilePreview(URL.createObjectURL(f))
    setPendingFile(f)
  }

  async function handleDeleteAvatar() {
    if (!profile.avatar_url) return

    try {
      setLoading(true)
      const supabase = createClient()

      try {
        const publicUrl = profile.avatar_url
        const marker = '/storage/v1/object/public/avatars/'
        let pathToRemove: string | null = null

        if (publicUrl.includes(marker)) {
          pathToRemove = publicUrl.split(marker)[1]
        } else {
          const idx = publicUrl.indexOf('/object/public/')
          if (idx !== -1) {
            const parts = publicUrl.substring(idx + '/object/public/'.length).split('/')
            if (parts.length > 1) pathToRemove = parts.slice(1).join('/')
          }
        }

        if (pathToRemove) {
          const candidates = [pathToRemove]
          if (pathToRemove.startsWith('avatars/')) {
            candidates.push(pathToRemove.replace(/^avatars\//, ''))
          }
          for (const p of candidates) {
            try {
              const { error: remErr } = await supabase.storage.from('avatars').remove([p])
              if (!remErr) break
            } catch {
              // ignore individual remove errors
            }
          }
        }
      } catch {
        // ignore storage removal errors
      }

      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
      const payload: UserProfile = { ...profile, avatar_url: null }
      const res = await fetch(`${base}/api/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const txt = await res.text()
        setError(txt || 'Error al eliminar foto')
        return
      }

      setProfile((p) => ({ ...p, avatar_url: null }))
      setFilePreview(null)
      setSuccess('Foto eliminada')
      try {
        window.dispatchEvent(
          new CustomEvent<{ avatar_url: string | null }>('profile:updated', {
            detail: { avatar_url: null },
          })
        )
      } catch {
        // ignore
      }
      setTimeout(() => setSuccess(null), 2500)
    } catch (err) {
      const e = err as Error
      setError(e.message || 'Error eliminando foto')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setLoading(true)
    setError(null)
    setSuccess(null)


    const bioToCheck = profile.bio || ''
    const linkedinToCheck = profile.linkedin_url || ''
    const githubToCheck = profile.github_url || ''

    if (bioToCheck.length > 300) {
      setLoading(false)
      setError('La bio debe tener como máximo 300 caracteres')
      return
    }
    if (linkedinToCheck && !linkedinToCheck.startsWith('https://linkedin.com/in/')) {
      setLoading(false)
      setError('El perfil de LinkedIn debe comenzar con https://linkedin.com/in/')
      return
    }
    if (githubToCheck && !githubToCheck.startsWith('https://github.com/')) {
      setLoading(false)
      setError('El perfil de GitHub debe comenzar con https://github.com/')
      return
    }

    try {
      const supabase = createClient()

      let newAvatarUrl: string | null = profile.avatar_url || null

      // Si hay un archivo pendiente, subirlo ahora
      if (pendingFile) {
        const { data: authData } = await supabase.auth.getUser()
        const user = authData?.user
        const userId = user?.id || 'anonymous'
        const safeName = pendingFile.name.replace(/\s+/g, '_')
        const path = `avatars/${userId}/${Date.now()}_${safeName}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, pendingFile, { upsert: true })

        if (uploadError) {
          setError(uploadError.message || 'Error subiendo avatar')
          setLoading(false)
          return
        }

        const { data: publicData } = await supabase.storage
          .from('avatars')
          .getPublicUrl(path)

        newAvatarUrl = publicData?.publicUrl || null
      }

      await supabase.auth.updateUser({
        data: { display_name: authName || undefined }
      })

      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
      const payload: UserProfile = {
        ...profile,
        avatar_url: newAvatarUrl,
        display_name: authName || profile.display_name,
        email: authEmail,
      }

      const res = await fetch(`${base}/api/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const txt = await res.text()
        setError(txt || 'Error al guardar')
      } else {
        setProfile(payload)
        savedProfileRef.current = payload
        setSavedAuthName(authName)
        setPendingFile(null)
        setFilePreview(newAvatarUrl)

        // Ahora sí disparar el evento para actualizar el navbar
        window.dispatchEvent(
          new CustomEvent<{ avatar_url: string | null }>('profile:updated', {
            detail: { avatar_url: newAvatarUrl },
          })
        )

        setSuccess('Perfil guardado correctamente')
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      const e = err as Error
      setError(e.message || 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl">

      {/* Input de archivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { handleFile(e); setShowPhotoMenu(false) }}
      />

      {/* Foto centrada */}
      <div className="flex flex-col items-center mb-6">
        <div
          className="relative w-36 h-36 shrink-0 rounded-full bg-brand-200 overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity ring-2 ring-brand-100"
          onClick={() => {
            if (filePreview || profile.avatar_url) setShowImageModal(true)
          }}
        >
          {filePreview || profile.avatar_url ? (
            <>
              <div
                className="absolute inset-0 scale-110"
                style={{
                  backgroundImage: `url(${filePreview || profile.avatar_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(6px)',
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={filePreview || profile.avatar_url!}
                alt="avatar"
                className="relative w-full h-full object-contain"
              />
            </>
          ) : (
            <span className="text-3xl font-semibold text-white">
              {getInitials(profile.display_name || authName || '')}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowPhotoMenu(true)}
          className="mt-2 text-sm font-medium text-brand-500 underline underline-offset-2 decoration-brand-300 hover:text-brand-600 hover:decoration-brand-500 transition-colors"
        >
          Editar foto
        </button>
      </div>

      {/* Mini-dialog opciones de foto */}
      {showPhotoMenu && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowPhotoMenu(false)}
        >
          <div
            className="bg-background rounded-2xl shadow-2xl w-72 overflow-hidden border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <p className="font-semibold text-sm">Foto de perfil</p>
              <button
                type="button"
                onClick={() => setShowPhotoMenu(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-muted/50 transition-colors text-left border-b border-border/50"
            >
              <ImageUp className="w-4 h-4 text-muted-foreground" />
              Seleccionar foto
            </button>
            {(filePreview || profile.avatar_url) && (
              <button
                type="button"
                onClick={() => { setShowPhotoMenu(false); handleDeleteAvatar() }}
                disabled={loading}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-left disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar foto
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mb-3">
        <label className="flex items-center gap-1.5 text-sm font-medium text-brand-600 mb-1.5">
          <User className="w-3.5 h-3.5" />
          Nombre registrado
        </label>
        <Input
          value={authName || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setAuthName(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label className="flex items-center gap-1.5 text-sm font-medium text-brand-600 mb-1.5">
          <Mail className="w-3.5 h-3.5" />
          Correo registrado
        </label>
        <Input value={authEmail || ''} disabled />
      </div>

      <div className="mb-3">
        <label className="flex items-center gap-1.5 text-sm font-medium text-brand-600 mb-1.5">
          <FileText className="w-3.5 h-3.5" />
          Bio
        </label>
        <textarea
          className="w-full rounded-md border p-2 text-sm"
          rows={4}
          value={profile.bio || ''}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            setProfile({ ...profile, bio: e.target.value })
          }
        />
      </div>

      <div className="mb-3">
        <label className="flex items-center gap-1.5 text-sm font-medium text-brand-600 mb-1.5">
          <Linkedin className="w-3.5 h-3.5" />
          LinkedIn <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
        </label>
        <Input
          value={profile.linkedin_url || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setProfile({ ...profile, linkedin_url: e.target.value })
          }
          placeholder="https://linkedin.com/in/tu-usuario"
        />
      </div>

      <div className="mb-3">
        <label className="flex items-center gap-1.5 text-sm font-medium text-brand-600 mb-1.5">
          <Github className="w-3.5 h-3.5" />
          GitHub <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
        </label>
        <Input
          value={profile.github_url || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setProfile({ ...profile, github_url: e.target.value })
          }
          placeholder="https://github.com/tu-usuario"
        />
      </div>

      <div className="mb-3">
        <label className="flex items-center gap-1.5 text-sm font-medium text-brand-600 mb-1.5">
          <CalendarDays className="w-3.5 h-3.5" />
          Fecha de nacimiento <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
        </label>
        <Input
          type="date"
          value={profile.birth_date || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setProfile({ ...profile, birth_date: e.target.value || null })
          }
        />
      </div>

      {accountCreatedAt && (
        <div className="mb-3">
          <label className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-1.5">
            <Clock className="w-3.5 h-3.5" />
            Miembro desde
          </label>
          <p className="text-sm px-3 py-2 rounded-md border bg-secondary/30 text-muted-foreground">
            {new Date(accountCreatedAt).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-2">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {success && (
        <div aria-live="polite" className="fixed right-4 bottom-6 z-50">
          <div className="bg-brand-700 text-white px-4 py-2 rounded-md shadow-lg">{success}</div>
        </div>
      )}

      <div className="border-t pt-4 mt-6 pb-4 flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 hover:scale-105 transition-all disabled:opacity-50 font-medium"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <Button
            type="button"
            className="bg-brand-500 hover:bg-brand-600 hover:scale-105 transition-all text-white hover:text-white gap-2 rounded-md px-4 py-2 h-auto text-sm font-medium"
            onClick={() => {
              const dirty = pendingFile !== null ||
                JSON.stringify(profile) !== JSON.stringify(savedProfileRef.current) ||
                authName !== savedAuthName
              const doLogout = () => {
                if (onLogout) {
                  onLogout()
                } else {
                  const supabase = createClient()
                  void supabase.auth.signOut().then(() => { window.location.href = '/login' })
                }
              }
              if (dirty) {
                setPendingAction(() => doLogout)
                setShowUnsavedDialog(true)
              } else {
                doLogout()
              }
            }}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
        <p className="text-xs text-muted-foreground/50 italic text-center">
          Guarda los cambios realizados antes de salir de tu perfil.
        </p>
      </div>

      {/* Dialog cambios sin guardar */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>⚠️</span> ¡Tienes cambios sin guardar!
            </DialogTitle>
            <DialogDescription>
              Si continúas sin guardar, perderás los cambios realizados en tu perfil.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setShowUnsavedDialog(false)}>
              OK
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowUnsavedDialog(false)
                pendingAction?.()
                setPendingAction(null)
              }}
            >
              Salir de todos modos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para ver imagen en grande */}
      {showImageModal && (filePreview || profile.avatar_url) && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={filePreview || profile.avatar_url!}
            alt="avatar ampliado"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}