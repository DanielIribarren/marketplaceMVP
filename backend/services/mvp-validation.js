const FIELD_LIMITS = {
  NAME_MAX_LENGTH: 100,
  ONE_LINER_MAX_LENGTH: 120,
  DESCRIPTION_MAX_WORDS: 500,
  EVIDENCE_MAX_WORDS: 300,
  SCREENSHOTS_MAX: 3,
  DIFFERENTIALS_COUNT: 3,
  TESTIMONIALS_MAX: 2,
  RISKS_COUNT: 3
}

export function validateOneLiner(oneLiner) {
  if (!oneLiner || oneLiner.trim().length === 0) {
    return { isValid: false, message: 'El one-liner es requerido' }
  }

  if (oneLiner.length > FIELD_LIMITS.ONE_LINER_MAX_LENGTH) {
    return {
      isValid: false,
      message: `Máximo ${FIELD_LIMITS.ONE_LINER_MAX_LENGTH} caracteres (tienes ${oneLiner.length})`
    }
  }

  // Más flexible: solo requiere longitud mínima razonable
  if (oneLiner.trim().length < 20) {
    return {
      isValid: false,
      message: 'El one-liner debe tener al menos 20 caracteres descriptivos'
    }
  }

  return { isValid: true }
}

export function validateDescription(description) {
  if (!description || description.trim().length === 0) {
    return { isValid: false, message: 'La descripción es requerida' }
  }

  const wordCount = description.trim().split(/\s+/).length

  if (wordCount > FIELD_LIMITS.DESCRIPTION_MAX_WORDS) {
    return {
      isValid: false,
      message: `Máximo ${FIELD_LIMITS.DESCRIPTION_MAX_WORDS} palabras (tienes ${wordCount})`
    }
  }

  // Más flexible: solo requiere longitud mínima de 15 palabras
  if (wordCount < 15) {
    return {
      isValid: false,
      message: 'La descripción debe tener al menos 15 palabras'
    }
  }

  return { isValid: true }
}

export function validateUrl(url) {
  if (!url || url.trim().length === 0) {
    return { isValid: false, message: 'La URL es requerida' }
  }

  try {
    const urlObj = new URL(url)
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, message: 'La URL debe usar http:// o https://' }
    }
    return { isValid: true }
  } catch {
    return { isValid: false, message: 'URL inválida' }
  }
}

export function validateMinimalEvidence(evidence) {
  if (!evidence || evidence.trim().length === 0) {
    return { isValid: false, message: 'La evidencia mínima es requerida' }
  }

  const wordCount = evidence.trim().split(/\s+/).length

  if (wordCount > FIELD_LIMITS.EVIDENCE_MAX_WORDS) {
    return {
      isValid: false,
      message: `Máximo ${FIELD_LIMITS.EVIDENCE_MAX_WORDS} palabras (tienes ${wordCount})`
    }
  }

  // Más flexible: solo requiere longitud mínima de 10 palabras
  if (wordCount < 10) {
    return {
      isValid: false,
      message: 'La evidencia debe tener al menos 10 palabras'
    }
  }

  return { isValid: true }
}

export function calculateQualitySignals(mvpData) {
  return {
    hasValidOneLiner: validateOneLiner(mvpData.one_liner || '').isValid,
    hasConcreteUseCase: validateDescription(mvpData.description || '').isValid,
    hasDemoOrScreenshot: 
      validateUrl(mvpData.demo_url || '').isValid || 
      (mvpData.images_urls && mvpData.images_urls.length > 0),
    hasMinimalEvidence: validateMinimalEvidence(mvpData.minimal_evidence || '').isValid,
    hasDealModality: !!mvpData.deal_modality
  }
}

export function canPublish(signals) {
  return Object.values(signals).every(signal => signal === true)
}

export function getPublishBlockers(signals) {
  const blockers = []

  if (!signals.hasValidOneLiner) {
    blockers.push('One-liner válido (tiene quién, dolor, resultado)')
  }
  if (!signals.hasConcreteUseCase) {
    blockers.push('Descripción con caso de uso concreto (no genérica)')
  }
  if (!signals.hasDemoOrScreenshot) {
    blockers.push('Demo URL válida o al menos 1 captura URL')
  }
  if (!signals.hasMinimalEvidence) {
    blockers.push('Evidencia mínima completada (tracción o eficiencia)')
  }
  if (!signals.hasDealModality) {
    blockers.push('Modalidad de deal seleccionada')
  }

  return blockers
}

export function validateMVPData(mvpData) {
  const errors = {}

  if (mvpData.title && mvpData.title.length > FIELD_LIMITS.NAME_MAX_LENGTH) {
    errors.title = `Máximo ${FIELD_LIMITS.NAME_MAX_LENGTH} caracteres`
  }

  const oneLinerValidation = validateOneLiner(mvpData.one_liner)
  if (!oneLinerValidation.isValid) {
    errors.one_liner = oneLinerValidation.message
  }

  const descriptionValidation = validateDescription(mvpData.description)
  if (!descriptionValidation.isValid) {
    errors.description = descriptionValidation.message
  }

  if (mvpData.demo_url) {
    const demoUrlValidation = validateUrl(mvpData.demo_url)
    if (!demoUrlValidation.isValid) {
      errors.demo_url = demoUrlValidation.message
    }
  }

  if (mvpData.images_urls && mvpData.images_urls.length > FIELD_LIMITS.SCREENSHOTS_MAX) {
    errors.images_urls = `Máximo ${FIELD_LIMITS.SCREENSHOTS_MAX} capturas`
  }

  const evidenceValidation = validateMinimalEvidence(mvpData.minimal_evidence)
  if (!evidenceValidation.isValid) {
    errors.minimal_evidence = evidenceValidation.message
  }

  if (mvpData.competitive_differentials) {
    if (mvpData.competitive_differentials.length !== FIELD_LIMITS.DIFFERENTIALS_COUNT) {
      errors.competitive_differentials = `Debe tener exactamente ${FIELD_LIMITS.DIFFERENTIALS_COUNT} diferenciales`
    }
  }

  if (!mvpData.deal_modality) {
    errors.deal_modality = 'La modalidad de deal es requerida'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}
