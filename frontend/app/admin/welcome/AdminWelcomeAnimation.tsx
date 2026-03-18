'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { MonitorCheck, User } from 'lucide-react'

const COLS = 38
const ROWS = 24

function BinaryRain() {
  const [grid, setGrid] = useState<number[]>(() =>
    Array.from({ length: COLS * ROWS }, () => (Math.random() > 0.5 ? 1 : 0))
  )
  const [bright, setBright] = useState<boolean[]>(() =>
    Array.from({ length: COLS * ROWS }, () => Math.random() > 0.93)
  )

  useEffect(() => {
    const id = setInterval(() => {
      setGrid(g => g.map(v => (Math.random() > 0.87 ? 1 - v : v)))
      setBright(Array.from({ length: COLS * ROWS }, () => Math.random() > 0.93))
    }, 120)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        fontFamily: 'monospace',
        fontSize: '13px',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {grid.map((v, i) => (
        <span
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: bright[i] ? '#ffffff' : '#FF6B35',
            opacity: bright[i] ? 0.55 : 0.1,
          }}
        >
          {v}
        </span>
      ))}
    </div>
  )
}

export function AdminWelcomeAnimation({ redirectTo = '/admin' }: { redirectTo?: string }) {
  const router = useRouter()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const exitTimer = setTimeout(() => setVisible(false), 3800)
    const redirectTimer = setTimeout(() => router.push(redirectTo), 4300)
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
            background: 'linear-gradient(135deg, #0d0602 0%, #180a03 50%, #0d0602 100%)',
            overflow: 'hidden',
          }}
        >
          {/* Lluvia binaria */}
          <BinaryRain />

          {/* Scanlines */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
              pointerEvents: 'none',
            }}
          />

          {/* Glow central naranja */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '700px',
              height: '700px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,107,53,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Glow naranja esquina superior */}
          <div
            style={{
              position: 'absolute',
              top: '-80px',
              right: '-80px',
              width: '400px',
              height: '400px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,107,53,0.1) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Contenido */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Logo M — rebota desde arriba */}
            <motion.div
              initial={{ y: -130, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 13, delay: 0.1 }}
              style={{
                width: '96px',
                height: '96px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #FF6B35, #e85a22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '22px',
                boxShadow:
                  '0 0 50px rgba(255,107,53,0.5), 0 0 110px rgba(255,107,53,0.15), 0 8px 32px rgba(0,0,0,0.7)',
              }}
            >
              <span
                style={{
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '48px',
                  lineHeight: 1,
                  userSelect: 'none',
                }}
              >
                M
              </span>
            </motion.div>

            {/* MVPMarket */}
            <motion.div
              initial={{ x: -80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22, delay: 0.55 }}
              style={{ display: 'flex', alignItems: 'baseline', marginBottom: '30px' }}
            >
              <span
                style={{
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '52px',
                  letterSpacing: '-1px',
                }}
              >
                MVP
              </span>
              <span
                style={{
                  color: '#FF6B35',
                  fontWeight: 900,
                  fontSize: '52px',
                  letterSpacing: '-1px',
                }}
              >
                Market
              </span>
            </motion.div>

            {/* Línea divisora verde */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.55, delay: 1.3 }}
              style={{
                width: '300px',
                height: '1px',
                background:
                  'linear-gradient(90deg, transparent, rgba(255,107,53,0.7), transparent)',
                marginBottom: '22px',
                transformOrigin: 'center',
              }}
            />

            {/* Modo Administrador — sube desde abajo */}
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.6 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255,107,53,0.08)',
                border: '1px solid rgba(255,107,53,0.25)',
                borderRadius: '999px',
                padding: '8px 22px',
              }}
            >
              <User size={16} color="#FF6B35" />
              <MonitorCheck size={18} color="#FF6B35" />
              <span
                style={{
                  color: '#FF6B35',
                  fontSize: '15px',
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  fontFamily: 'monospace',
                }}
              >
                Modo Administrador
              </span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
