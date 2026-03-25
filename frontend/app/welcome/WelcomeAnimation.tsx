'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

export function WelcomeAnimation({ name, redirectTo = '/' }: { name: string; redirectTo?: string }) {
  const router = useRouter()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const exitTimer = setTimeout(() => setVisible(false), 3600)
    const redirectTimer = setTimeout(() => router.push(redirectTo), 4100)
    return () => {
      clearTimeout(exitTimer)
      clearTimeout(redirectTimer)
    }
  }, [router, redirectTo])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
            overflow: 'hidden',
          }}
        >
          {/* Grid decorativo */}
          <div style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.035,
            backgroundImage: 'linear-gradient(rgba(255,107,53,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,53,0.5) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
            pointerEvents: 'none',
          }} />

          {/* Orb superior derecho */}
          <div style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,107,53,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Orb inferior izquierdo */}
          <div style={{
            position: 'absolute',
            bottom: '-80px',
            left: '-80px',
            width: '380px',
            height: '380px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,107,53,0.09) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Orb central suave */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '700px',
            height: '700px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,107,53,0.05) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />

          {/* Contenido animado */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Logo M — rebota desde arriba */}
            <motion.div
              initial={{ y: -140, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 12, delay: 0.1 }}
              style={{
                width: '96px',
                height: '96px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #FF6B35, #e85a22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
                boxShadow: '0 0 40px rgba(255,107,53,0.4), 0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              <span style={{ color: 'white', fontWeight: 900, fontSize: '48px', lineHeight: 1, userSelect: 'none' }}>
                M
              </span>
            </motion.div>

            {/* MVPMarket — desliza desde la izquierda */}
            <motion.div
              initial={{ x: -80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22, delay: 0.55 }}
              style={{ display: 'flex', alignItems: 'baseline', marginBottom: '20px' }}
            >
              <span style={{ color: 'white', fontWeight: 900, fontSize: '52px', letterSpacing: '-1px' }}>MVP</span>
              <span style={{ color: '#FF6B35', fontWeight: 900, fontSize: '52px', letterSpacing: '-1px' }}>Market</span>
            </motion.div>

            {/* ¡Bienvenido! — sube con fade */}
            <motion.p
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.55, delay: 1.5 }}
              style={{ color: '#d1d5db', fontSize: '20px', fontWeight: 500 }}
            >
              ¡Bienvenido,{' '}
              <span style={{ color: '#FF6B35', fontWeight: 700 }}>{name}</span>!
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
