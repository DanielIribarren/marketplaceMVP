import { supabase } from '../utils/supabase-client.js'

export async function verifyAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No autorizado',
        message: 'Token de autenticación requerido' 
      })
    }

    const token = authHeader.replace('Bearer ', '')

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ 
        error: 'No autorizado',
        message: 'Token inválido o expirado' 
      })
    }

    req.user = user
    next()
  } catch (error) {
    console.error('Error en autenticación:', error)
    res.status(500).json({ 
      error: 'Error del servidor',
      message: 'Error al verificar autenticación' 
    })
  }
}
