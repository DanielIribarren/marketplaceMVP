"use client"

import { useState, useEffect, ChangeEvent } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import type { StorageError } from "@supabase/storage-js"
import { X } from "lucide-react"

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

interface ProfileUpdatedEvent extends CustomEvent {
  detail: { avatar_url: string | null }
}

export default function ProfileEditor() {
  const [profile, setProfile] = useState<UserProfile>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [authName, setAuthName] = useState<string | null>(null)
  const [authEmail, setAuthEmail] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [accountCreatedAt, setAccountCreatedAt] = useState<string | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)

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
          setAuthName(
            (user.user_metadata?.display_name as string | undefined) ||
            (user.user_metadata?.name as string | undefined) ||
            null
          )
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
      <div className="flex items-center gap-4 mb-4">
        <div
          className={`w-20 h-20 rounded-full bg-brand-200 overflow-hidden flex items-center justify-center ${
            (filePreview || profile.avatar_url) ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
          }`}
          onClick={() => {
            if (filePreview || profile.avatar_url) {
              setShowImageModal(true)
            }
          }}
        >
          {filePreview || profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={filePreview || profile.avatar_url!}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl font-semibold text-white">
              {getInitials(profile.display_name || authName || '')}
            </span>
          )}
        </div>
        <div>
          <label className="text-sm text-muted-foreground block mb-1">Foto de perfil</label>
          <Input type="file" accept="image/*" onChange={handleFile} />
          {(filePreview || profile.avatar_url) && (
            <button
              type="button"
              className="mt-2 px-3 py-1.5 text-sm bg-red-100 text-red-800 border border-red-300 rounded-md hover:bg-red-700 hover:text-white transition-colors disabled:opacity-50"
              onClick={handleDeleteAvatar}
              disabled={loading}
            >
              Eliminar foto
            </button>
          )}
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-sm mb-1">Nombre registrado</label>
        <Input
          value={authName || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setAuthName(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm mb-1">Correo registrado</label>
        <Input value={authEmail || ''} disabled />
      </div>

      <div className="mb-3">
        <label className="block text-sm mb-1">Bio</label>
        <textarea
          className="w-full rounded-md border p-2"
          rows={4}
          value={profile.bio || ''}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            setProfile({ ...profile, bio: e.target.value })
          }
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm mb-1">LinkedIn (opcional)</label>
        <Input
          value={profile.linkedin_url || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setProfile({ ...profile, linkedin_url: e.target.value })
          }
          placeholder="https://linkedin.com/in/tu-usuario"
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm mb-1">GitHub (opcional)</label>
        <Input
          value={profile.github_url || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setProfile({ ...profile, github_url: e.target.value })
          }
          placeholder="https://github.com/tu-usuario"
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm mb-1">Fecha de nacimiento (opcional)</label>
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
          <label className="block text-sm mb-1 text-muted-foreground">Miembro desde</label>
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

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-primary hover:border-primary hover:text-white transition-colors disabled:opacity-50 font-medium"
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {success && (
        <div aria-live="polite" className="fixed right-4 bottom-6 z-50">
          <div className="bg-brand-700 text-white px-4 py-2 rounded-md shadow-lg">{success}</div>
        </div>
      )}

      <div className="border-t pt-4 mt-6 flex justify-center">
        <button
          type="button"
          className="px-4 py-2 bg-red-100 text-red-800 border border-red-300 rounded-md hover:bg-red-700 hover:text-white transition-colors font-medium"
          onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signOut()
            window.location.reload()
          }}
        >
          Cerrar sesión
        </button>
      </div>

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