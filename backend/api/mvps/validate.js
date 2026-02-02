import { 
    validateOneLiner,
    validateDescription,
    validateUrl,
    validateMinimalEvidence,
    calculateQualitySignals
} from '../../services/mvp-validation.js'

/**
 * POST /api/mvps/validate
 * Valida un campo específico en tiempo real
 */
export async function validateField(req, res) {
    try {
        const { field, value } = req.body

    if (!field) {
      return res.status(400).json({ 
        error: 'Campo requerido',
        message: 'Debes especificar el campo a validar' 
      })
    }

    let validation

    switch (field) {
      case 'one_liner':
        validation = validateOneLiner(value)
        break
      
      case 'description':
        validation = validateDescription(value)
        break
      
      case 'demo_url':
        validation = validateUrl(value)
        break
      
      case 'minimal_evidence':
        validation = validateMinimalEvidence(value)
        break
      
      default:
        return res.status(400).json({ 
          error: 'Campo inválido',
          message: `El campo "${field}" no tiene validación específica` 
        })
    }

    res.status(200).json({
      success: true,
      field,
      validation
    })

  } catch (error) {
    console.error('Error al validar campo:', error)
    res.status(500).json({ 
      error: 'Error del servidor',
      message: 'No se pudo validar el campo',
      details: error.message
    })
  }
}

/**
 * POST /api/mvps/quality-signals
 * Calcula las 5 señales de calidad para un MVP
 */
export async function getQualitySignals(req, res) {
  try {
    const mvpData = req.body

    const signals = calculateQualitySignals(mvpData)
    const count = Object.values(signals).filter(Boolean).length

    res.status(200).json({
      success: true,
      signals,
      count,
      canPublish: count === 5
    })

  } catch (error) {
    console.error('Error al calcular señales:', error)
    res.status(500).json({ 
      error: 'Error del servidor',
      message: 'No se pudieron calcular las señales de calidad',
      details: error.message
    })
  }
}
