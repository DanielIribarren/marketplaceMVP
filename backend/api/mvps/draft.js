import { supabase } from '../../utils/supabase-client.js'
import { randomUUID } from 'crypto'

function slugify(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function buildSlug(title) {
  const base = slugify(title) || 'mvp'
  const suffix = randomUUID().split('-')[0]
  return `${base}-${suffix}`
}


/**
 * POST /api/mvps/draft
 * Guarda un borrador de MVP (auto-guardado cada 10s)
 */
export async function saveDraft(req, res) {
  try {
    const userId = req.user.id
    const mvpData = req.body
    
    // Preparar datos para insertar/actualizar
    const draftData = {
      owner_id: userId,
      title: mvpData.title || null,
      one_liner: mvpData.one_liner || null,
      slug: mvpData.slug || buildSlug(mvpData.title),
      description: mvpData.description || null,
      demo_url: mvpData.demo_url || null,
      images_urls: mvpData.images_urls || [],
      monetization_model: mvpData.monetization_model || null,
      minimal_evidence: mvpData.minimal_evidence || null,
      competitive_differentials: mvpData.competitive_differentials || [],
      deal_modality: mvpData.deal_modality || null,
      price_range: mvpData.price_range || null,
      transfer_checklist: mvpData.transfer_checklist || {
        codeAndDocs: false,
        domainOrLanding: false,
        integrationAccounts: false,
        ownIp: false
      },
      video_url: mvpData.video_url || null,
      testimonials: mvpData.testimonials || [],
      roadmap_60_days: mvpData.roadmap_60_days || [],
      risks_and_mitigations: mvpData.risks_and_mitigations || [],
      status: 'draft',
      updated_at: new Date().toISOString()
    }

    let result

    if (!mvpData.id) {
      draftData.slug = buildSlug(mvpData.title)
    }
    // Si tiene ID, actualizar; si no, crear nuevo
    if (mvpData.id) {
      // Verificar que el usuario sea el owner
      const { data: existing } = await supabase
        .from('mvps')
        .select('owner_id')
        .eq('id', mvpData.id)
        .single()

      if (!existing || existing.owner_id !== userId) {
        return res.status(403).json({ 
          error: 'Acceso denegado',
          message: 'No tienes permiso para editar este MVP' 
        })
      }

      // Actualizar borrador existente
      const { data, error } = await supabase
        .from('mvps')
        .update(draftData)
        .eq('id', mvpData.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Crear nuevo borrador
      const { data, error } = await supabase
        .from('mvps')
        .insert([draftData])
        .select()
        .single()

      if (error) throw error
      result = data
    }

    res.status(200).json({
      success: true,
      data: result,
      message: 'Borrador guardado exitosamente'
    })

  } catch (error) {
    console.error('Error al guardar borrador:', error)
    res.status(500).json({ 
      error: 'Error del servidor',
      message: 'No se pudo guardar el borrador',
      details: error.message
    })
  }
}
