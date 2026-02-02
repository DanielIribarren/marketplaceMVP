/**
 * Tipos y esquemas para publicación de MVP
 * Versión minimal pero que vende: 10 campos + 5 señales de calidad
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum MonetizationModel {
  SAAS_MONTHLY = 'saas_monthly',
  ONE_TIME_LICENSE = 'one_time_license',
  TRANSACTIONAL = 'transactional',
  ADVERTISING = 'advertising',
  TO_DEFINE = 'to_define'
}

export const MonetizationModelLabels: Record<MonetizationModel, string> = {
  [MonetizationModel.SAAS_MONTHLY]: 'SaaS mensual',
  [MonetizationModel.ONE_TIME_LICENSE]: 'Licencia única',
  [MonetizationModel.TRANSACTIONAL]: 'Transaccional',
  [MonetizationModel.ADVERTISING]: 'Publicidad',
  [MonetizationModel.TO_DEFINE]: 'A definir'
}

export enum DealModality {
  SALE = 'sale',
  EQUITY = 'equity',
  LICENSE = 'license',
  REV_SHARE = 'rev_share'
}

export const DealModalityLabels: Record<DealModality, string> = {
  [DealModality.SALE]: 'Venta',
  [DealModality.EQUITY]: 'Equity',
  [DealModality.LICENSE]: 'Licencia',
  [DealModality.REV_SHARE]: 'Rev-Share'
}

// ============================================================================
// TIPOS PRINCIPALES
// ============================================================================

export interface MVPPublication {
  // Campo 1: Nombre del MVP
  name: string

  // Campo 2: One-liner de valor (≤120 caracteres)
  oneLiner: string

  // Campo 3: Descripción breve (≤500 palabras)
  description: string

  // Campo 4: Link a demo o repositorio/landing
  demoUrl: string

  // Campo 5: Capturas clave (hasta 3 URLs)
  screenshots: string[] // Max 3

  // Campo 6: Modelo de monetización
  monetizationModel: MonetizationModel

  // Campo 7: Evidencia mínima (≤300 palabras)
  minimalEvidence: string

  // Campo 8: Diferencial competitivo (3 puntos)
  competitiveDifferentials: string[] // Exactly 3

  // Campo 9: Modalidad de deal y rango de precio
  dealModality: DealModality
  priceRange: string // Texto libre: "USD 2k-5k"

  // Campo 10: Checklist de transferencia
  transferChecklist: {
    codeAndDocs: boolean
    domainOrLanding: boolean
    integrationAccounts: boolean
    ownIp: boolean
  }

  // Campos opcionales (Paso "Plus")
  videoUrl?: string // YouTube/Vimeo
  testimonials?: string[] // Max 2
  roadmap60Days?: string[] // Bullets
  risksAndMitigations?: string[] // 3 bullets
}


// ============================================================================
// HELPERS Y CONSTANTES
// ============================================================================

export const FIELD_LIMITS = {
  NAME_MAX_LENGTH: 100,
  ONE_LINER_MAX_LENGTH: 120,
  DESCRIPTION_MAX_WORDS: 500,
  EVIDENCE_MAX_WORDS: 300,
  SCREENSHOTS_MAX: 3,
  DIFFERENTIALS_COUNT: 3,
  TESTIMONIALS_MAX: 2,
  RISKS_COUNT: 3
} as const

export const MICROCOPYS = {
  name: {
    label: 'Nombre del MVP',
    placeholder: 'Ej: AutoConcilia Pro',
    help: 'Evita nombres crípticos; di lo que hace.'
  },
  oneLiner: {
    label: 'One-liner de valor',
    placeholder: 'Ej: Contadores freelance automatizan conciliaciones 3× más rápido',
    help: 'Fórmula: Quién + qué resuelve + resultado medible (máx. 120 caracteres)',
    formula: 'Quién + qué resuelve + resultado medible'
  },
  description: {
    label: 'Descripción breve',
    placeholder: 'Cuenta un caso real: quién, qué, cuánto mejoró...',
    help: 'Estructura: problema concreto → solución → por qué ahora → caso de uso (máx. 500 palabras)',
    structure: 'Problema concreto → Solución → Por qué ahora → Caso de uso'
  },
  demoUrl: {
    label: 'Link a demo o repositorio',
    placeholder: 'https://tu-demo.com o https://github.com/tu-repo',
    help: 'URL de demo en vivo, repositorio público o landing page'
  },
  screenshots: {
    label: 'Capturas clave',
    placeholder: 'https://i.imgur.com/ejemplo.png',
    help: 'URLs de imágenes (hasta 3). Usa servicios gratuitos como Imgur o Cloudinary'
  },
  monetizationModel: {
    label: 'Modelo de monetización',
    help: 'Si aún es hipótesis, indícalo con "A definir"'
  },
  minimalEvidence: {
    label: 'Evidencia mínima',
    placeholder: 'Ej: 10 usuarios de prueba, ahorro 40% tiempo en piloto, primer pago...',
    help: 'Si no hay usuarios: benchmark de tiempo/costo o validación con entrevistas (máx. 300 palabras)',
    examples: [
      '10 usuarios de prueba activos',
      'Ahorro 40% tiempo en piloto con 3 clientes',
      'Primer pago recibido: USD 500',
      'Validación con 5 entrevistas a target'
    ]
  },
  competitiveDifferentials: {
    label: 'Diferencial competitivo',
    placeholder: 'Ej: vs. Competidor A: 50% menos pasos',
    help: 'Evita "mejor UX"; di el número: "3× más rápido" (3 puntos)',
    examples: [
      'vs. Competidor A: 50% menos pasos',
      'vs. DIY: setup en 10 min',
      'Regulación X: cumplimos Y básico'
    ]
  },
  dealModality: {
    label: 'Modalidad de deal',
    help: 'Cómo quieres transferir o monetizar el MVP'
  },
  priceRange: {
    label: 'Rango de precio',
    placeholder: 'Ej: USD 2k-5k',
    help: 'Si dudas de precio, pon rango; abre conversación'
  },
  transferChecklist: {
    label: 'Checklist de transferencia',
    help: 'Marca lo que incluyes en la transferencia',
    items: {
      codeAndDocs: 'Código + Documentación básica',
      domainOrLanding: 'Dominio/landing (si aplica)',
      integrationAccounts: 'Cuentas integraciones (si aplica)',
      ownIp: 'IP propia; sin terceros'
    }
  },
  // Campos Plus opcionales
  videoUrl: {
    label: 'Video demo (opcional)',
    placeholder: 'https://youtube.com/watch?v=...',
    help: 'URL a YouTube/Vimeo (no listado). No se aloja, solo embed'
  },
  testimonials: {
    label: 'Testimonios cortos (opcional)',
    placeholder: 'Ej: "Redujo mi tiempo de conciliación de 4h a 30min" - Juan P.',
    help: 'Hasta 2 testimonios breves'
  },
  roadmap60Days: {
    label: 'Roadmap 60 días (opcional)',
    placeholder: 'Ej: Integración con Stripe',
    help: 'Próximas mejoras planificadas'
  },
  risksAndMitigations: {
    label: 'Riesgos y mitigaciones (opcional)',
    placeholder: 'Ej: Riesgo: Dependencia de API X. Mitigación: Fallback manual',
    help: '3 riesgos principales y cómo los mitigas'
  }
} as const


// ============================================================================
// DRAFT AUTO-SAVE
// ============================================================================

export interface MVPDraft extends Partial<MVPPublication> {
  id?: string
  userId: string
  lastSaved: Date
  status: 'draft' | 'published'
}

export function createEmptyDraft(userId: string): MVPDraft {
  return {
    userId,
    lastSaved: new Date(),
    status: 'draft',
    name: '',
    oneLiner: '',
    description: '',
    demoUrl: '',
    screenshots: [],
    competitiveDifferentials: ['', '', ''],
    transferChecklist: {
      codeAndDocs: false,
      domainOrLanding: false,
      integrationAccounts: false,
      ownIp: false
    }
  }
}

export interface QualitySignals {
  hasValidOneLiner: boolean
  hasConcreteUseCase: boolean
  hasDemoOrScreenshot: boolean
  hasMinimalEvidence: boolean
  hasDealModality: boolean
}