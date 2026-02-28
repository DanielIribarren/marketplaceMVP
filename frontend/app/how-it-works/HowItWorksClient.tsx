'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Rocket, Search, Calendar, CheckCircle2, ArrowRight,
  Users, Shield, Zap, TrendingUp, FileText, Clock,
  MessageSquare, Star, ChevronDown, Eye, DollarSign,
  Handshake, RefreshCw, XCircle, BadgeCheck, BarChart3,
  Lock, Globe, Play
} from 'lucide-react'
import useEmblaCarousel from 'embla-carousel-react'
import AutoScroll from 'embla-carousel-auto-scroll'
import { motion } from 'framer-motion'

// ─── Hook: detectar cuando un elemento entra en viewport ────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, visible }
}

// ─── Componente FadeIn ───────────────────────────────────────────────────────
function FadeIn({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  direction?: 'up' | 'left' | 'right' | 'none'
  className?: string
}) {
  const { ref, visible } = useInView()

  const transforms: Record<string, string> = {
    up: 'translateY(32px)',
    left: 'translateX(-32px)',
    right: 'translateX(32px)',
    none: 'none',
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : transforms[direction],
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

// ─── Contador animado ────────────────────────────────────────────────────────
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0)
  const { ref, visible } = useInView()

  useEffect(() => {
    if (!visible) return
    const duration = 1800
    const steps = 60
    const step = target / steps
    let current = 0
    const timer = setInterval(() => {
      current += step
      if (current >= target) { setValue(target); clearInterval(timer) }
      else setValue(Math.round(current))
    }, duration / steps)
    return () => clearInterval(timer)
  }, [visible, target])

  return (
    <span ref={ref}>
      {value}{suffix}
    </span>
  )
}

// ─── Tipos de roles ──────────────────────────────────────────────────────────
type Role = 'entrepreneur' | 'investor'

// ─── Componente: Selector de rol con animación de path ──────────────────────
interface RoleSelectorProps {
  role: Role
  setRole: (role: Role) => void
}

function RoleSelectorWithPath({ role, setRole }: RoleSelectorProps) {
  // Define el color del punto según el rol actual
  const dotColor = role === 'entrepreneur' ? '#FF6B35' : '#1a1a1a'

  // Path curvo ondulado que sigue la trayectoria del marcador amarillo
  const pathD = "M 120 100 Q 200 40, 300 110 Q 400 180, 500 90 Q 600 30, 680 100"

  // Puntos calculados usando la fórmula de curva Bézier cuadrática
  // Path: M 120 100 Q 200 40, 300 110 Q 400 180, 500 90 Q 600 30, 680 100
  // Son 3 curvas cuadráticas concatenadas
  const pathPoints = {
    // Primera curva: (120,100) -> control(200,40) -> (300,110)
    // Segunda curva: (300,110) -> control(400,180) -> (500,90)
    // Tercera curva: (500,90) -> control(600,30) -> (680,100)
    cx: [120, 140, 160, 180, 196, 213, 230, 248, 266, 284, 300, 330, 360, 390, 418, 444, 468, 488, 500, 530, 560, 588, 615, 640, 662, 680],
    cy: [100, 81, 66, 54, 47, 44, 46, 52, 62, 77, 94, 110, 126, 142, 156, 168, 176, 180, 177, 168, 152, 130, 102, 72, 54, 100],
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '1100px',
      margin: '0 auto',
      padding: '40px 20px',
      minHeight: '280px',
    }}>
      {/* SVG con la línea punteada curva tipo mapa */}
      <svg
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          height: '280px',
          pointerEvents: 'none',
          overflow: 'visible',
        }}
        viewBox="0 0 800 280"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Línea punteada curva que conecta ambos lados */}
        <path
          d={pathD}
          fill="none"
          stroke="#cbd5e0"
          strokeWidth="3"
          strokeDasharray="8 8"
          strokeLinecap="round"
        />

        {/* Punto animado que sigue el path EXACTAMENTE */}
        <motion.circle
          r="16"
          fill={dotColor}
          initial={false}
          animate={
            role === 'entrepreneur'
              ? {
                  // De derecha a izquierda siguiendo el path exacto
                  cx: [...pathPoints.cx].reverse(),
                  cy: [...pathPoints.cy].reverse(),
                }
              : {
                  // De izquierda a derecha siguiendo el path exacto
                  cx: pathPoints.cx,
                  cy: pathPoints.cy,
                }
          }
          transition={{
            duration: 1.4,
            ease: [0.43, 0.13, 0.23, 0.96],
          }}
          filter={`drop-shadow(0 4px 12px ${dotColor}60)`}
        />
      </svg>

      {/* Contenedor de las dos cajas */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        zIndex: 1,
        paddingTop: '20px',
      }}>
        {/* Caja Emprendedor */}
        <motion.button
          onClick={() => setRole('entrepreneur')}
          animate={{
            background: role === 'entrepreneur'
              ? 'linear-gradient(135deg, #FF6B35, #e85a22)'
              : '#ffffff',
            color: role === 'entrepreneur' ? '#ffffff' : '#6b7280',
            scale: role === 'entrepreneur' ? 1.05 : 1,
          }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{
            width: '280px',
            padding: '32px 24px',
            borderRadius: '20px',
            border: role === 'entrepreneur' ? 'none' : '2px solid #e5e7eb',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            boxShadow: role === 'entrepreneur'
              ? '0 12px 32px rgba(255,107,53,0.4)'
              : '0 4px 12px rgba(0,0,0,0.05)',
            position: 'relative',
          }}
        >
          <span style={{ fontSize: '48px', lineHeight: 1 }}>🚀</span>
          <span style={{
            fontSize: '22px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}>
            Emprendedor
          </span>
          <span style={{
            fontSize: '13px',
            opacity: role === 'entrepreneur' ? 0.9 : 0.6,
            fontWeight: 500,
            textAlign: 'center',
          }}>
            Quiero vender mi MVP
          </span>
        </motion.button>

        {/* Caja Inversor */}
        <motion.button
          onClick={() => setRole('investor')}
          animate={{
            background: role === 'investor'
              ? 'linear-gradient(135deg, #1a1a1a, #333333)'
              : '#ffffff',
            color: role === 'investor' ? '#ffffff' : '#6b7280',
            scale: role === 'investor' ? 1.05 : 1,
          }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{
            width: '280px',
            padding: '32px 24px',
            borderRadius: '20px',
            border: role === 'investor' ? 'none' : '2px solid #e5e7eb',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            boxShadow: role === 'investor'
              ? '0 12px 32px rgba(0,0,0,0.3)'
              : '0 4px 12px rgba(0,0,0,0.05)',
            position: 'relative',
          }}
        >
          <span style={{ fontSize: '48px', lineHeight: 1 }}>💼</span>
          <span style={{
            fontSize: '22px',
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}>
            Inversor
          </span>
          <span style={{
            fontSize: '13px',
            opacity: role === 'investor' ? 0.9 : 0.6,
            fontWeight: 500,
            textAlign: 'center',
          }}>
            Busco oportunidades
          </span>
        </motion.button>
      </div>
    </div>
  )
}

// ─── Datos de pasos ──────────────────────────────────────────────────────────
const entrepreneurSteps = [
  {
    icon: FileText,
    title: 'Crea tu publicación',
    desc: 'Completa los 10 campos requeridos: nombre, one-liner, descripción, demo URL, capturas, modelo de monetización, evidencia, diferenciales, modalidad de deal y checklist de transferencia.',
    tag: 'Paso 1',
    color: '#FF6B35',
  },
  {
    icon: BadgeCheck,
    title: 'Alcanza las 5 señales de calidad',
    desc: 'El sistema valida automáticamente: one-liner válido, caso de uso concreto, demo o captura disponible, evidencia mínima con métricas reales y modalidad de deal seleccionada.',
    tag: 'Paso 2',
    color: '#FF6B35',
  },
  {
    icon: Calendar,
    title: 'Configura tu disponibilidad',
    desc: 'Define los horarios en los que puedes reunirte con inversores. Selecciona fechas y franjas horarias en tu zona horaria. Esto es obligatorio para publicar.',
    tag: 'Paso 3',
    color: '#FF6B35',
  },
  {
    icon: Eye,
    title: 'Revisión y aprobación',
    desc: 'El equipo revisa tu publicación manualmente. Solo proyectos con métricas reales, documentación completa y señales de calidad verificadas son aprobados.',
    tag: 'Paso 4',
    color: '#FF6B35',
  },
  {
    icon: Handshake,
    title: 'Confirma reuniones y cierra',
    desc: 'Cuando un inversor solicite una reunión, la recibirás en tu calendario. Puedes confirmar, rechazar o proponer otra fecha. El deal se cierra directamente.',
    tag: 'Paso 5',
    color: '#FF6B35',
  },
]

const investorSteps = [
  {
    icon: Search,
    title: 'Explora el marketplace',
    desc: 'Filtra por modalidad de deal (venta, equity, licencia, rev-share), rango de precio, fecha de publicación y busca por texto. Solo MVPs aprobados aparecen en resultados.',
    tag: 'Paso 1',
    color: '#1a1a1a',
  },
  {
    icon: BarChart3,
    title: 'Analiza en profundidad',
    desc: 'Cada MVP muestra: descripción completa, evidencia mínima con métricas reales, 3 diferenciales competitivos, checklist de lo que se transfiere y el modelo de monetización.',
    tag: 'Paso 2',
    color: '#1a1a1a',
  },
  {
    icon: Calendar,
    title: 'Agenda una reunión',
    desc: 'Elige un horario disponible del emprendedor, selecciona el tipo de reunión (videollamada, llamada o presencial) y deja un mensaje. La solicitud llega al calendario del emprendedor.',
    tag: 'Paso 3',
    color: '#1a1a1a',
  },
  {
    icon: RefreshCw,
    title: 'Negocia fechas si es necesario',
    desc: 'Si el emprendedor no puede en ese horario, puede proponer una contrapropuesta. Tú la aceptas, propones otra o rechazas. El sistema mantiene el historial de negociación.',
    tag: 'Paso 4',
    color: '#1a1a1a',
  },
  {
    icon: DollarSign,
    title: 'Cierra el deal',
    desc: 'Una vez confirmada la reunión, el link de videollamada queda disponible. El emprendedor y tú coordinan los detalles del cierre directamente, sin intermediarios.',
    tag: 'Paso 5',
    color: '#1a1a1a',
  },
]

const meetingStatuses = [
  { status: 'pending', label: 'Pendiente', desc: 'El inversor solicitó la reunión. El emprendedor debe responder.', color: '#f97316', bg: '#ffedd5' },
  { status: 'confirmed', label: 'Confirmada', desc: 'Ambas partes acordaron el horario. El link de reunión está disponible.', color: '#16a34a', bg: '#dcfce7' },
  { status: 'counterproposal', label: 'Contrapropuesta', desc: 'Una de las partes propuso un horario alternativo. La otra debe responder.', color: '#fbbf24', bg: '#fef9c3' },
  { status: 'rejected', label: 'Rechazada', desc: 'Una de las partes rechazó definitivamente la reunión.', color: '#ef4444', bg: '#fee2e2' },
  { status: 'completed', label: 'Completada', desc: 'La reunión ocurrió. El deal puede proceder al cierre.', color: '#52525b', bg: '#f4f4f5' },
]

const dealModalities = [
  {
    key: 'sale',
    label: 'Venta',
    icon: DollarSign,
    desc: 'Transferencia completa del MVP. El comprador obtiene todo: código, dominio, cuentas y IP.',
    range: '$2k – $50k+',
    color: '#FF6B35',
  },
  {
    key: 'equity',
    label: 'Equity',
    icon: TrendingUp,
    desc: 'El inversor entra al cap table a cambio de capital. El fundador mantiene el control operativo.',
    range: '5% – 30%',
    color: '#ef4444',
  },
  {
    key: 'license',
    label: 'Licencia',
    icon: Lock,
    desc: 'El comprador usa el software bajo licencia. El creador mantiene la propiedad intelectual.',
    range: '$500 – $5k/año',
    color: '#fbbf24',
  },
  {
    key: 'rev_share',
    label: 'Rev-Share',
    icon: RefreshCw,
    desc: 'El inversor aporta capital a cambio de un porcentaje de los ingresos generados.',
    range: '10% – 25% ingresos',
    color: '#16a34a',
  },
]

const qualitySignals = [
  { key: 'hasValidOneLiner', label: 'One-liner válido (quién + qué resuelve + resultado medible)', done: true },
  { key: 'hasConcreteUseCase', label: 'Descripción con caso de uso concreto (no genérica)', done: true },
  { key: 'hasDemoOrScreenshot', label: 'Demo URL válida o al menos 1 captura de pantalla', done: true },
  { key: 'hasMinimalEvidence', label: 'Evidencia mínima con datos concretos (usuarios, tiempo, costo)', done: false },
  { key: 'hasDealModality', label: 'Modalidad de deal seleccionada', done: false },
]

const meetingStatusesDouble = [...meetingStatuses, ...meetingStatuses, ...meetingStatuses]

function MeetingCarouselSection() {
  const [emblaRef] = useEmblaCarousel(
    { loop: true, dragFree: true, align: 'start' },
    [AutoScroll({ speed: 1.2, stopOnInteraction: false, stopOnMouseEnter: true })]
  )

  return (
    <section style={{ padding: '80px 0', background: '#ffffff', overflowX: 'hidden', overflowY: 'visible' }}>
      {/* Título — con padding lateral */}
      <div style={{ padding: '0 16px', maxWidth: '1280px', margin: '0 auto' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800,
              color: '#111827', marginBottom: '12px',
            }}>
              Sistema de reuniones integrado
            </h2>
            <p style={{ color: '#6b7280', fontSize: '1.1rem', maxWidth: '560px', margin: '0 auto' }}>
              Cada reunión pasa por estados claros. Ambas partes pueden confirmar,
              rechazar o proponer nuevas fechas en cualquier momento.
            </p>
          </div>
        </FadeIn>
      </div>

      {/* Carrusel — full width sin padding */}
      <div ref={emblaRef} style={{ overflowX: 'hidden', overflowY: 'visible', cursor: 'grab' }}>
        <div style={{ display: 'flex', gap: '16px', paddingLeft: '40px', paddingTop: '8px', paddingBottom: '40px' }}>
          {meetingStatusesDouble.map((ms, i) => (
            <div
              key={i}
              style={{
                flex: '0 0 300px',
                background: ms.bg,
                borderRadius: '16px',
                padding: '24px',
                border: `1px solid ${ms.color}25`,
                userSelect: 'none',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'translateY(-4px)'
                el.style.boxShadow = `0 12px 32px ${ms.color}22`
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'none'
                el.style.boxShadow = 'none'
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px',
              }}>
                <span style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: ms.color, flexShrink: 0,
                  boxShadow: `0 0 8px ${ms.color}80`,
                }} />
                <span style={{ fontWeight: 800, fontSize: '16px', color: ms.color }}>
                  {ms.label}
                </span>
              </div>
              <p style={{ color: '#374151', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
                {ms.desc}
              </p>

              {/* Decorative bottom bar */}
              <div style={{
                marginTop: '20px', height: '3px', borderRadius: '999px',
                background: `linear-gradient(90deg, ${ms.color}, ${ms.color}40)`,
              }} />
            </div>
          ))}
        </div>
      </div>

      {/* Hint de interacción */}
      <div style={{
        textAlign: 'center', marginTop: '24px',
        color: '#d1d5db', fontSize: '12px', letterSpacing: '0.05em',
      }}>
        ← arrastra para explorar →
      </div>

      {/* Calendario mock — con padding lateral */}
      <div style={{ padding: '0 16px', maxWidth: '1280px', margin: '40px auto 0' }}>
        <FadeIn delay={0.2}>
          <div style={{
            background: '#f9fafb', borderRadius: '16px',
            border: '1px solid #e5e7eb', padding: '28px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Calendar size={18} style={{ color: '#FF6B35' }} />
              <span style={{ fontWeight: 700, color: '#111827' }}>Vista de calendario — Marzo 2025</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                <div key={d} style={{
                  textAlign: 'center', fontSize: '11px', fontWeight: 600,
                  color: '#9ca3af', paddingBottom: '8px',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>{d}</div>
              ))}
              {[...Array(6)].map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: 31 }, (_, i) => {
                const day = i + 1
                const events: Record<number, { color: string; label: string }> = {
                  5: { color: '#16a34a', label: 'Confirmada' },
                  8: { color: '#f97316', label: 'Pendiente' },
                  12: { color: '#fbbf24', label: 'Contrapr.' },
                  17: { color: '#52525b', label: 'Completada' },
                  22: { color: '#16a34a', label: 'Confirmada' },
                  26: { color: '#f97316', label: 'Pendiente' },
                }
                const ev = events[day]
                return (
                  <div key={day} style={{
                    borderRadius: '8px', padding: '6px 4px', textAlign: 'center',
                    background: ev ? ev.color + '15' : 'transparent',
                    border: ev ? `1px solid ${ev.color}30` : '1px solid transparent',
                  }}>
                    <div style={{
                      fontSize: '12px', fontWeight: ev ? 700 : 400,
                      color: ev ? ev.color : '#6b7280',
                    }}>{day}</div>
                    {ev && (
                      <div style={{
                        fontSize: '9px', color: ev.color, fontWeight: 600,
                        whiteSpace: 'nowrap', overflow: 'hidden',
                        textOverflow: 'ellipsis', marginTop: '2px',
                      }}>{ev.label}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── FAQ con stickman ────────────────────────────────────────────────────────
const faqItems = [
  {
    q: '¿Cuánto tarda la revisión de un MVP?',
    a: 'El equipo revisa cada publicación en menos de 24 horas hábiles. Recibirás un email con el resultado y, si hay correcciones, tendrás instrucciones claras para ajustar tu listing.',
  },
  {
    q: '¿Necesito cuenta para explorar el marketplace?',
    a: 'Puedes navegar y ver las tarjetas públicas sin cuenta. Para ver el demo URL, capturas completas y solicitar reuniones necesitas registrarte. El registro es gratuito y tarda menos de 2 minutos.',
  },
  {
    q: '¿Qué pasa si el emprendedor no puede en el horario que seleccioné?',
    a: 'El sistema de reuniones permite contrapropuestas. El emprendedor puede rechazar la fecha y proponer un horario alternativo. Vos puedes aceptar, volver a contraproposer, o cancelar sin penalización.',
  },
  {
    q: '¿MVPMarket cobra comisión por las transacciones?',
    a: 'MVPMarket no interviene en el cierre del deal ni cobra comisión sobre el precio de venta. El valor está en la conexión y la confianza: el acuerdo final es entre tú y el comprador.',
  },
  {
    q: '¿Puedo publicar más de un MVP?',
    a: 'Sí. Podés tener múltiples listings activos simultáneamente. Cada uno pasa por revisión independiente y tiene su propio sistema de reuniones y estado.',
  },
  {
    q: '¿Cómo se protege el código durante las negociaciones?',
    a: 'El código fuente nunca se comparte en la plataforma. Tú decides qué muestras (demo, capturas, repositorio privado con acceso puntual). MVPMarket facilita el contacto, el control del activo es tuyo.',
  },
]

// ─── Lupa inspeccionando documento ──────────────────────────────────────────
function MagnifierWidget({ activeIndex, color }: { activeIndex: number | null; color: string }) {
  const isActive = activeIndex !== null

  return (
    <>
      <style>{`
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(52px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(52px) rotate(-360deg); }
        }
        @keyframes orbitY {
          0%,100% { margin-top: 0px; }
          50%      { margin-top: 38px; }
        }
        @keyframes magnifierEntry {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes sparkle {
          0%,100% { opacity: 0.3; r: 2; }
          50%      { opacity: 0.9; r: 4; }
        }
      `}</style>

      <div style={{
        width: 220, height: 220, position: 'relative',
        opacity: isActive ? 1 : 0.85,
        transform: isActive ? 'scale(1)' : 'scale(0.92)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}>
        <svg width="220" height="220" viewBox="0 0 180 180" style={{ position: 'absolute', top: 0, left: 0 }}>
          {/* Documento */}
          <rect x="50" y="42" width="80" height="96" rx="8"
            fill="#ffffff" stroke="#e5e7eb" strokeWidth="2" />
          <polygon points="110,42 130,62 110,62"
            fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1" />
          {[72, 84, 96, 108, 120].map((y, i) => (
            <rect key={i} x="62" y={y} width={i === 4 ? 30 : 56} height="5"
              rx="2.5" fill={i === 0 ? color + '60' : '#e5e7eb'} />
          ))}
          {/* Tilde en documento */}
          <circle cx="90" cy="62" r="10" fill={color + '15'} />
          <path d="M85 62 L88.5 65.5 L95 58"
            fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Órbita punteada (elipse) */}
          <ellipse cx="90" cy="90" rx="52" ry="36"
            fill="none" stroke={color + '20'} strokeWidth="1.5" strokeDasharray="4 4" />

          {/* Destellos SVG animados — solo cuando activo */}
          {isActive && (
            <>
              <circle cx="44" cy="50" r="3" fill={color}>
                <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="r" values="2;4;2" dur="1.2s" repeatCount="indefinite" />
              </circle>
              <circle cx="138" cy="55" r="3" fill={color}>
                <animate attributeName="opacity" values="0.3;0.9;0.3" dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="r" values="2;4;2" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <circle cx="140" cy="130" r="3" fill={color}>
                <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2s" repeatCount="indefinite" />
                <animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" />
              </circle>
            </>
          )}
        </svg>

        {/* Lupa — orbita con CSS transform en div */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: 0, height: 0,
        }}>
          <div style={{
            animation: 'orbit 2.8s linear infinite',
            transformOrigin: '0 0',
          }}>
            <svg width="32" height="32" viewBox="0 0 28 28"
              style={{ marginLeft: -16, marginTop: -16 }}>
              <circle cx="12" cy="11" r="8"
                fill="none" stroke={color} strokeWidth="2.5" />
              <circle cx="12" cy="11" r="4" fill={color + '20'} />
              <circle cx="9.5" cy="8.5" r="2" fill="white" opacity="0.7" />
              <line x1="18" y1="17" x2="25" y2="24"
                stroke={color} strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>
    </>
  )
}

function FaqSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const colors = ['#FF6B35', '#ef4444', '#fbbf24', '#16a34a', '#fb923c', '#1a1a1a']
  const activeColor = openFaq !== null ? colors[openFaq % colors.length] : '#FF6B35'

  return (
    <section style={{ padding: '80px 16px', background: '#f9fafb' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              fontWeight: 800, color: '#111827', marginBottom: '12px',
            }}>
              Preguntas frecuentes
            </h2>
            <p style={{ color: '#6b7280', fontSize: '1rem' }}>
              Todo lo que necesitas saber antes de publicar o invertir.
            </p>
          </div>
        </FadeIn>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 220px',
          gap: '32px',
          alignItems: 'start',
          position: 'relative',
        }}>
          {/* FAQs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {faqItems.map((item, i) => {
              const isOpen = openFaq === i
              const color = colors[i % colors.length]
              return (
                <div
                  key={i}
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  style={{
                    background: '#ffffff',
                    border: `1px solid ${isOpen ? color + '50' : '#e5e7eb'}`,
                    borderLeft: `4px solid ${isOpen ? color : '#e5e7eb'}`,
                    borderRadius: '12px',
                    padding: '20px 24px',
                    cursor: 'pointer',
                    transition: 'all 0.25s',
                    boxShadow: isOpen ? `0 4px 20px ${color}15` : 'none',
                    transform: isOpen ? 'translateX(6px)' : 'none',
                  }}
                  onMouseEnter={e => {
                    if (!isOpen) (e.currentTarget as HTMLElement).style.borderLeftColor = color
                  }}
                  onMouseLeave={e => {
                    if (!isOpen) (e.currentTarget as HTMLElement).style.borderLeftColor = '#e5e7eb'
                  }}
                >
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', gap: '16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: isOpen ? color : '#f3f4f6',
                        color: isOpen ? '#fff' : '#9ca3af',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 800, flexShrink: 0,
                        transition: 'all 0.25s',
                      }}>{i + 1}</span>
                      <span style={{
                        fontWeight: 600, fontSize: '15px',
                        color: isOpen ? '#111827' : '#374151',
                      }}>
                        {item.q}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '20px', color: isOpen ? color : '#d1d5db',
                      transform: isOpen ? 'rotate(45deg)' : 'none',
                      transition: 'all 0.25s',
                      flexShrink: 0,
                    }}>+</span>
                  </div>

                  {isOpen && (
                    <div style={{
                      marginTop: '16px',
                      paddingTop: '16px',
                      borderTop: `1px solid ${color}20`,
                      color: '#6b7280',
                      fontSize: '14px',
                      lineHeight: 1.7,
                    }}>
                      {item.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Lupa con posicion dinamica */}
          <div style={{ position: 'relative', minHeight: '500px' }}>
            {(() => {
              const CARD_HEIGHT = 68
              const CARD_GAP = 12

              // Posicion vertical: cuando hay seleccion, apunta a esa card
              const topOffset = openFaq !== null
                ? openFaq * (CARD_HEIGHT + CARD_GAP) + CARD_HEIGHT / 2 - 110
                : 60

              // Posicion horizontal: más a la derecha en reposo, corre a la izquierda al seleccionar
              const leftVal = openFaq !== null ? '10px' : '75%'
              const translateX = openFaq !== null ? '0' : '-50%'
              const scale = openFaq !== null ? 1 : 1.25

              return (
                <div style={{
                  position: 'sticky',
                  top: '120px',
                }}>
                  <div style={{
                    position: 'absolute',
                    left: leftVal,
                    top: `${Math.max(0, topOffset)}px`,
                    transform: `translateX(${translateX}) scale(${scale})`,
                    transformOrigin: 'center top',
                    transition: 'all 0.5s cubic-bezier(0.34, 1.3, 0.64, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0px',
                  }}>
                    <MagnifierWidget activeIndex={openFaq} color={activeColor} />
                    <p style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: openFaq !== null ? activeColor : '#a0aec0',
                      textAlign: 'center',
                      letterSpacing: '0.02em',
                      transition: 'color 0.35s ease',
                      whiteSpace: 'nowrap',
                      marginTop: '-25px',
                    }}>
                      {openFaq !== null ? 'Inspeccionando...' : '¡Selecciona una pregunta!'}
                    </p>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────
export function HowItWorksClient() {
  const [role, setRole] = useState<Role>('entrepreneur')

  const steps = role === 'entrepreneur' ? entrepreneurSteps : investorSteps

  return (
    <main>
      {/* ── HERO ── */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
          position: 'relative',
          overflow: 'hidden',
          padding: '80px 16px 100px',
        }}
      >
        {/* Decorative grid */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.03,
          backgroundImage: 'linear-gradient(rgba(255,107,53,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,53,0.4) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }} />

        {/* Orbs */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px', width: '400px', height: '400px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,53,0.12) 0%, transparent 70%)',
          animation: 'pulse 4s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', left: '-60px', width: '300px', height: '300px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,53,0.08) 0%, transparent 70%)',
          animation: 'pulse 6s ease-in-out infinite reverse',
        }} />

        <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '64px', alignItems: 'center' }}>

            {/* Left */}
            <div>
              <FadeIn>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.3)',
                  borderRadius: '999px', padding: '6px 16px', color: '#FF6B35',
                  fontSize: '13px', fontWeight: 600, marginBottom: '24px',
                }}>
                  <Rocket size={14} /> Cómo funciona
                </span>
              </FadeIn>

              <FadeIn delay={0.1}>
                <h1 style={{
                  fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1,
                  color: '#ffffff', marginBottom: '24px',
                }}>
                  El marketplace que conecta{' '}
                  <span style={{
                    background: 'linear-gradient(135deg, #FF6B35, #ff8c5a)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>
                    MVPs validados
                  </span>
                  {' '}con capital real
                </h1>
              </FadeIn>

              <FadeIn delay={0.2}>
                <p style={{ color: '#9ca3af', fontSize: '1.1rem', lineHeight: 1.7, marginBottom: '32px', maxWidth: '520px' }}>
                  Emprendedores publican proyectos con métricas verificadas. Inversores los descubren, analizan y agendan reuniones directamente. Sin intermediarios, sin pérdida de tiempo.
                </p>
              </FadeIn>

              <FadeIn delay={0.3}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '40px' }}>
                  {[
                    { icon: Shield, text: 'Revisión manual 100%' },
                    { icon: Clock, text: 'Respuesta en 24h' },
                    { icon: Users, text: 'Comunidad verificada' },
                    { icon: Globe, text: 'Sin fronteras' },
                  ].map(({ icon: Icon, text }) => (
                    <span key={text} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px', padding: '8px 14px', color: '#d1d5db', fontSize: '13px',
                    }}>
                      <Icon size={13} style={{ color: '#FF6B35' }} /> {text}
                    </span>
                  ))}
                </div>
              </FadeIn>

              <FadeIn delay={0.4}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <Link href="/register" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: 'linear-gradient(135deg, #FF6B35, #e85a22)',
                    color: '#fff', borderRadius: '10px', padding: '14px 28px',
                    fontWeight: 700, fontSize: '15px', textDecoration: 'none',
                    boxShadow: '0 8px 32px rgba(255,107,53,0.35)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(255,107,53,0.45)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(255,107,53,0.35)' }}
                  >
                    Publicar mi MVP <ArrowRight size={16} />
                  </Link>
                  <Link href="/marketplace" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff', borderRadius: '10px', padding: '14px 28px',
                    fontWeight: 600, fontSize: '15px', textDecoration: 'none',
                    transition: 'background 0.2s',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)' }}
                  >
                    Explorar marketplace
                  </Link>
                </div>
              </FadeIn>
            </div>

            {/* Right — Dashboard card mock */}
            <FadeIn delay={0.3} direction="left">
              <div style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px', padding: '28px',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Dashboard</div>
                    <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700 }}>
                      MVP<span style={{ color: '#FF6B35' }}>Market</span>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
                    borderRadius: '999px', padding: '5px 12px',
                    color: '#16a34a', fontSize: '12px', fontWeight: 600,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', animation: 'pulse 2s infinite', display: 'inline-block' }} />
                    En vivo
                  </div>
                </div>

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  {[
                    { label: 'MVPs activos', value: 150, suffix: '+', color: '#f97316' },
                    { label: 'En transacciones', value: 2, suffix: '.5M+', color: '#22c55e', prefix: '$' },
                    { label: 'Inversores', value: 340, suffix: '+', color: '#f05252' },
                    { label: 'Tasa de cierre', value: 89, suffix: '%', color: '#fcd34d' },
                  ].map(({ label, value, suffix, color, prefix }) => (
                    <div key={label} style={{
                      background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div style={{ color: '#6b7280', fontSize: '11px', marginBottom: '6px' }}>{label}</div>
                      <div style={{ color, fontSize: '22px', fontWeight: 800 }}>
                        {prefix}<Counter target={value} />{suffix}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent activity */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                  <div style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                    Actividad reciente
                  </div>
                  {[
                    { dot: '#16a34a', text: 'AutoConcilia Pro — Reunión confirmada', time: '2m' },
                    { dot: '#FF6B35', text: 'DataSync API — Nuevo inversor interesado', time: '15m' },
                    { dot: '#ef4444', text: 'ShipFast Tool — Deal cerrado', time: '1h' },
                  ].map(({ dot, text, time }) => (
                    <div key={text} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      marginBottom: '10px', color: '#9ca3af', fontSize: '12px',
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{text}</span>
                      <span style={{ color: '#4b5563' }}>{time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

          </div>
        </div>

        {/* CSS animations */}
        <style>{`
          @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.7; transform:scale(1.05); } }
          @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
          @keyframes shimmer { 0% { background-position:-200% center; } 100% { background-position:200% center; } }
        `}</style>
      </section>

      {/* ── FLUJO POR ROL ── */}
      <section style={{ padding: '80px 16px', background: '#f9fafb' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, color: '#111827', marginBottom: '12px' }}>
                El proceso paso a paso
              </h2>
              <p style={{ color: '#6b7280', fontSize: '1.1rem', maxWidth: '560px', margin: '0 auto' }}>
                Elige tu rol y descubre exactamente qué pasa desde el primer click hasta el cierre del deal.
              </p>
            </div>
          </FadeIn>

          {/* Selector de rol con animación */}
          <FadeIn delay={0.1}>
            <RoleSelectorWithPath role={role} setRole={setRole} />
          </FadeIn>

          {/* Steps */}
          <div style={{ display: 'grid', gap: '16px' }}>
            {steps.map((step, i) => {
              const Icon = step.icon
              return (
                <FadeIn key={step.title} delay={i * 0.08}>
                  <div style={{
                    display: 'flex', gap: '20px', alignItems: 'flex-start',
                    background: '#ffffff', borderRadius: '16px', padding: '24px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                  }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.boxShadow = `0 8px 32px rgba(0,0,0,0.1)`
                      el.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
                      el.style.transform = 'none'
                    }}
                  >
                    {/* Number */}
                    <div style={{
                      flexShrink: 0, width: '48px', height: '48px', borderRadius: '12px',
                      background: step.color === '#FF6B35' ? 'rgba(255,107,53,0.1)' : 'rgba(26,26,26,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', fontWeight: 800, color: step.color,
                    }}>
                      {i + 1}
                    </div>
                    {/* Icon + content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <Icon size={18} style={{ color: step.color }} />
                        <span style={{ fontWeight: 700, fontSize: '16px', color: '#111827' }}>{step.title}</span>
                        <span style={{
                          marginLeft: 'auto', fontSize: '11px', fontWeight: 600,
                          color: step.color, background: step.color === '#FF6B35' ? 'rgba(255,107,53,0.08)' : 'rgba(26,26,26,0.06)',
                          borderRadius: '999px', padding: '3px 10px',
                        }}>
                          {step.tag}
                        </span>
                      </div>
                      <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── SISTEMA DE REUNIONES ── */}
      <MeetingCarouselSection />

      {/* ── SEÑALES DE CALIDAD ── */}
      <section style={{ padding: '80px 16px', background: '#111827' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '60px', alignItems: 'center' }}>

            <FadeIn>
              <div>
                <span style={{
                  display: 'inline-block', background: 'rgba(255,107,53,0.15)',
                  border: '1px solid rgba(255,107,53,0.3)', borderRadius: '999px',
                  padding: '5px 14px', color: '#FF6B35', fontSize: '12px', fontWeight: 600,
                  marginBottom: '20px',
                }}>
                  Control de calidad
                </span>
                <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>
                  5 señales de calidad obligatorias
                </h2>
                <p style={{ color: '#9ca3af', fontSize: '1rem', lineHeight: 1.7, marginBottom: '28px' }}>
                  Antes de publicar, el sistema valida automáticamente 5 criterios. Solo cuando los 5 están activos el botón de publicar se desbloquea. Esto garantiza que cada MVP en el marketplace tiene el nivel mínimo de información para que un inversor tome una decisión informada.
                </p>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FF6B35' }}>100%</div>
                    <div style={{ color: '#6b7280', fontSize: '12px' }}>revisión manual</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#16a34a' }}>0</div>
                    <div style={{ color: '#6b7280', fontSize: '12px' }}>perfiles falsos</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444' }}>&lt;24h</div>
                    <div style={{ color: '#6b7280', fontSize: '12px' }}>respuesta media</div>
                  </div>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.15} direction="left">
              <div style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px', padding: '28px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  {/* Circular progress */}
                  <svg width={60} height={60} viewBox="0 0 60 60">
                    <circle cx={30} cy={30} r={24} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
                    <circle cx={30} cy={30} r={24} fill="none" stroke="#FF6B35" strokeWidth={5}
                      strokeDasharray={`${(3 / 5) * 150.8} 150.8`}
                      strokeLinecap="round" transform="rotate(-90 30 30)"
                    />
                    <text x={30} y={35} textAnchor="middle" fill="#FF6B35" fontSize={14} fontWeight={700}>3/5</text>
                  </svg>
                  <div>
                    <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '16px' }}>Señales de calidad</div>
                    <div style={{ color: '#6b7280', fontSize: '13px' }}>Ejemplo de publicación en progreso</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {qualitySignals.map(({ key, label, done }) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                        background: done ? '#16a34a' : 'rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: done ? 'none' : '1px solid rgba(255,255,255,0.15)',
                      }}>
                        {done && <CheckCircle2 size={14} color="#ffffff" />}
                      </div>
                      <span style={{
                        color: done ? '#d1fae5' : '#6b7280',
                        fontSize: '13px', lineHeight: 1.5,
                      }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{
                  marginTop: '20px', padding: '12px 16px',
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: '10px', color: '#fbbf24', fontSize: '13px',
                }}>
                  ⚠️ Faltan 2 señales para poder publicar
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── MODALIDADES DE DEAL ── */}
      <section style={{ padding: '80px 16px', background: '#f9fafb' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: '56px' }}>
              <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, color: '#111827', marginBottom: '12px' }}>
                Modalidades de deal
              </h2>
              <p style={{ color: '#6b7280', fontSize: '1.1rem', maxWidth: '560px', margin: '0 auto' }}>
                Cada MVP define su modalidad al publicarse. Esto permite a los inversores filtrar exactamente el tipo de deal que buscan.
              </p>
            </div>
          </FadeIn>

          <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {dealModalities.map((dm, i) => {
              const Icon = dm.icon
              return (
                <FadeIn key={dm.key} delay={i * 0.08}>
                  <div style={{
                    background: '#ffffff', borderRadius: '16px', padding: '28px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'default',
                  }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.transform = 'translateY(-4px)'
                      el.style.boxShadow = `0 12px 40px ${dm.color}20`
                      el.style.borderColor = dm.color + '40'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.transform = 'none'
                      el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
                      el.style.borderColor = '#e5e7eb'
                    }}
                  >
                    <div style={{
                      width: 48, height: 48, borderRadius: '12px',
                      background: dm.color + '12',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: '16px',
                    }}>
                      <Icon size={22} style={{ color: dm.color }} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '17px', color: '#111827', marginBottom: '8px' }}>{dm.label}</div>
                    <p style={{ color: '#6b7280', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>{dm.desc}</p>
                    <div style={{
                      display: 'inline-block', background: dm.color + '10',
                      borderRadius: '6px', padding: '5px 12px',
                      color: dm.color, fontSize: '12px', fontWeight: 600,
                    }}>
                      {dm.range}
                    </div>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CONFIANZA ── */}
      <section style={{ padding: '80px 16px', background: '#ffffff' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: '56px' }}>
              <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, color: '#111827', marginBottom: '12px' }}>
                Seguridad y confianza
              </h2>
              <p style={{ color: '#6b7280', fontSize: '1.1rem', maxWidth: '560px', margin: '0 auto' }}>
                Cada elemento del proceso está diseñado para minimizar riesgos y maximizar la calidad de las conexiones.
              </p>
            </div>
          </FadeIn>

          <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {[
              {
                icon: Shield, color: '#FF6B35',
                title: 'Revisión manual 100%',
                desc: 'Ningún MVP se publica automáticamente. El equipo verifica cada publicación, las métricas declaradas y la documentación adjunta antes de aprobarlo.',
                stat: '100%', statLabel: 'revisión manual',
              },
              {
                icon: BadgeCheck, color: '#16a34a',
                title: 'Usuarios verificados',
                desc: 'Cada cuenta pasa por verificación de email. No hay bots, no hay perfiles falsos. La comunicación es siempre entre personas reales con intención real.',
                stat: '0', statLabel: 'perfiles falsos',
              },
              {
                icon: MessageSquare, color: '#ef4444',
                title: 'Comunicación directa',
                desc: 'Emprendedores e inversores se comunican directamente a través del sistema de reuniones integrado. Sin intermediarios, sin comisiones ocultas.',
                stat: '<24h', statLabel: 'respuesta media',
              },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <FadeIn key={item.title} delay={i * 0.1}>
                  <div style={{
                    background: '#f9fafb', borderRadius: '16px', padding: '28px',
                    border: '1px solid #e5e7eb',
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '12px',
                      background: item.color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: '16px',
                    }}>
                      <Icon size={22} style={{ color: item.color }} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '17px', color: '#111827', marginBottom: '8px' }}>{item.title}</div>
                    <p style={{ color: '#6b7280', fontSize: '13px', lineHeight: 1.6, marginBottom: '20px' }}>{item.desc}</p>
                    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '24px', fontWeight: 800, color: item.color }}>{item.stat}</span>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>{item.statLabel}</span>
                    </div>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <FaqSection />

      {/* ── CTA FINAL ── */}
      <section style={{
        padding: '80px 16px',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.03,
          backgroundImage: 'linear-gradient(rgba(255,107,53,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,53,0.4) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }} />
        {/* Radial glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px', height: '400px',
          background: 'radial-gradient(ellipse, rgba(255,107,53,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <FadeIn>
            <span style={{
              display: 'inline-block', background: 'rgba(255,107,53,0.12)',
              border: '1px solid rgba(255,107,53,0.25)', borderRadius: '999px',
              padding: '6px 16px', color: '#FF6B35', fontSize: '13px', fontWeight: 600,
              marginBottom: '24px',
            }}>
              ¿Listo para empezar?
            </span>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h2 style={{
              fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, color: '#ffffff',
              marginBottom: '16px', lineHeight: 1.2,
            }}>
              Tu{' '}
              <span style={{
                background: 'linear-gradient(135deg, #FF6B35 0%, #ff8c5a 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                siguiente paso
              </span>
              {' '}empieza aquí
            </h2>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p style={{ color: '#9ca3af', fontSize: '1.1rem', lineHeight: 1.7, marginBottom: '40px' }}>
              Miles de emprendedores ya publicaron sus MVPs. Cientos de inversores los están evaluando en este momento.
            </p>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '36px' }}>
              <Link href="/register" style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'linear-gradient(135deg, #FF6B35, #e85a22)',
                color: '#fff', borderRadius: '12px', padding: '16px 32px',
                fontWeight: 700, fontSize: '16px', textDecoration: 'none',
                boxShadow: '0 8px 32px rgba(255,107,53,0.35)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.transform = 'translateY(-2px)'
                  el.style.boxShadow = '0 12px 40px rgba(255,107,53,0.5)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.transform = 'none'
                  el.style.boxShadow = '0 8px 32px rgba(255,107,53,0.35)'
                }}
              >
                Publicar mi MVP <Rocket size={16} />
              </Link>
              <Link href="/marketplace" style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                color: '#ffffff', borderRadius: '12px', padding: '16px 32px',
                fontWeight: 600, fontSize: '16px', textDecoration: 'none',
                transition: 'background 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)' }}
              >
                Explorar marketplace <Search size={16} />
              </Link>
            </div>
          </FadeIn>

          <FadeIn delay={0.4}>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { icon: CheckCircle2, text: 'Sin tarjeta de crédito' },
                { icon: Zap, text: 'Setup en 5 minutos' },
                { icon: MessageSquare, text: 'Soporte incluido' },
              ].map(({ icon: Icon, text }) => (
                <span key={text} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  color: '#6b7280', fontSize: '13px',
                }}>
                  <Icon size={14} style={{ color: '#FF6B35' }} /> {text}
                </span>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>
    </main>
  )
}