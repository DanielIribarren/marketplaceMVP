"use client"

import { useState, useEffect, ChangeEvent } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import type { StorageError } from "@supabase/storage-js"

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
  const [authName, setAuthName] = useState<string | null>(null)
  const [authEmail, setAuthEmail] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [emailVerificationSent, setEmailVerificationSent] = useState(false)

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
        if (mounted) setProfile(data || {})
      } catch {
        // ignore
      }
    })()
    return () => { mounted = false }
  }, [])

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return

    setFilePreview(URL.createObjectURL(f))

    try {
      setLoading(true)
      const supabase = createClient()
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user
      const userId = user?.id || 'anonymous'
      const safeName = f.name.replace(/\s+/g, '_')
      const path = `avatars/${userId}/${Date.now()}_${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, f, { upsert: true })

      if (uploadError) {
        setError(uploadError.message || 'Error subiendo avatar')
        return
      }

      const { data: publicData } = await supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      const publicUrl = publicData?.publicUrl || ''

      setProfile((p) => ({ ...p, avatar_url: publicUrl }))
      setFilePreview(publicUrl)
      window.dispatchEvent(
        new CustomEvent<{ avatar_url: string | null }>('profile:updated', {
          detail: { avatar_url: publicUrl },
        })
      )
    } catch (err) {
      const storageErr = err as StorageError
      setError(storageErr.message || 'Error al subir archivo')
    } finally {
      setLoading(false)
    }
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

    const emailToCheck = authEmail || profile.email || ''
    const bioToCheck = profile.bio || ''
    const linkedinToCheck = profile.linkedin_url || ''
    const githubToCheck = profile.github_url || ''
    const emailRe = /^\S+@\S+\.\S+$/

    if (emailToCheck && !emailRe.test(emailToCheck)) {
      setLoading(false)
      setError('Correo inválido')
      return
    }
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
      if (authEmail && authEmail !== profile.email) {
        await supabase.auth.updateUser({
          email: authEmail,
          data: { display_name: authName || undefined },
        })
      }

      const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
      const payload: UserProfile = {
        ...profile,
        display_name: authName || profile.display_name,
        email: authEmail || profile.email,
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
        if (authEmail && authEmail !== profile.email) {
          setEmailVerificationSent(true)
        } else {
          setEmailVerificationSent(false)
        }
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
        <div className="w-20 h-20 rounded-full bg-gray-300 overflow-hidden flex items-center justify-center">
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
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="mt-2"
              onClick={handleDeleteAvatar}
              disabled={loading}
            >
              Eliminar foto
            </Button>
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
        <Input
          value={authEmail || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setAuthEmail(e.target.value)}
        />
        {emailVerificationSent && (
          <p className="text-xs text-muted-foreground mt-1">
            Se envió un correo de verificación para confirmar el cambio de email
          </p>
        )}
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

      {error && (
        <div className="mb-2">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      {success && (
        <div aria-live="polite" className="fixed right-4 bottom-6 z-50">
          <div className="bg-green-600 text-white px-4 py-2 rounded-md shadow-lg">{success}</div>
        </div>
      )}

      <div className="border-t pt-4">
        <Button
          type="button"
          variant="destructive"
          onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signOut()
            window.location.reload()
          }}
        >
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}