import { supabase } from '../utils/supabase-client.js'
import nodemailer from 'nodemailer'
import crypto from 'crypto'

// In-memory store for OTP codes (simple approach for MVP)
// Key: email, Value: { code, expiresAt, attempts }
const otpStore = new Map()

const OTP_EXPIRY_MINUTES = 10
const MAX_ATTEMPTS = 5

function generateOTP() {
  return crypto.randomInt(1000, 9999).toString()
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.MAIL_SERVER || 'smtp.gmail.com',
    port: Number(process.env.MAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD
    }
  })
}

/**
 * POST /api/auth/forgot-password
 * Generates a 4-digit OTP and sends it via email
 */
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body

    if (!email || !email.trim()) {
      return res.status(400).json({
        error: 'Email requerido',
        message: 'Debes proporcionar un correo electrónico'
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Check if user exists in Supabase auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('Error listing users:', listError)
      return res.status(500).json({
        error: 'Error del servidor',
        message: 'No se pudo verificar el usuario'
      })
    }

    const userExists = users.some(u => u.email?.toLowerCase() === normalizedEmail)

    if (!userExists) {
      // Return success anyway to prevent email enumeration
      return res.status(200).json({
        success: true,
        message: 'Si el correo existe, recibirás un código de verificación'
      })
    }

    // Generate OTP
    const code = generateOTP()
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

    // Store OTP
    otpStore.set(normalizedEmail, {
      code,
      expiresAt,
      attempts: 0
    })

    // Send email
    const transporter = createTransporter()

    await transporter.sendMail({
      from: `"MVP Marketplace" <${process.env.MAIL_USERNAME}>`,
      to: normalizedEmail,
      subject: 'Código de recuperación de contraseña - MVP Marketplace',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 56px; height: 56px; background: #2563eb; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: white; font-weight: bold; font-size: 24px;">M</span>
            </div>
          </div>
          <h2 style="text-align: center; color: #111827; margin-bottom: 8px;">Recuperación de contraseña</h2>
          <p style="text-align: center; color: #6b7280; margin-bottom: 24px;">
            Usa el siguiente código para restablecer tu contraseña
          </p>
          <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #111827;">${code}</span>
          </div>
          <p style="text-align: center; color: #6b7280; font-size: 14px;">
            Este código expira en ${OTP_EXPIRY_MINUTES} minutos.
          </p>
          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">
            Si no solicitaste este código, ignora este correo.
          </p>
        </div>
      `
    })

    console.log(`[AUTH] OTP sent to ${normalizedEmail}`)

    res.status(200).json({
      success: true,
      message: 'Si el correo existe, recibirás un código de verificación'
    })

  } catch (error) {
    console.error('Error in forgotPassword:', error)
    res.status(500).json({
      error: 'Error del servidor',
      message: 'No se pudo enviar el código de recuperación'
    })
  }
}

/**
 * POST /api/auth/verify-code
 * Verifies the 4-digit OTP code
 */
export async function verifyCode(req, res) {
  try {
    const { email, code } = req.body

    if (!email || !code) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Email y código son requeridos'
      })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const storedOtp = otpStore.get(normalizedEmail)

    if (!storedOtp) {
      return res.status(400).json({
        error: 'Código inválido',
        message: 'No hay un código de recuperación activo para este correo'
      })
    }

    // Check expiry
    if (new Date() > storedOtp.expiresAt) {
      otpStore.delete(normalizedEmail)
      return res.status(400).json({
        error: 'Código expirado',
        message: 'El código ha expirado. Solicita uno nuevo.'
      })
    }

    // Check max attempts
    if (storedOtp.attempts >= MAX_ATTEMPTS) {
      otpStore.delete(normalizedEmail)
      return res.status(429).json({
        error: 'Demasiados intentos',
        message: 'Has excedido el número máximo de intentos. Solicita un nuevo código.'
      })
    }

    // Verify code
    if (storedOtp.code !== code.trim()) {
      storedOtp.attempts += 1
      return res.status(400).json({
        error: 'Código incorrecto',
        message: `Código incorrecto. Te quedan ${MAX_ATTEMPTS - storedOtp.attempts} intentos.`
      })
    }

    // Code is valid - generate a reset token
    const resetToken = crypto.randomUUID()
    otpStore.set(normalizedEmail, {
      ...storedOtp,
      verified: true,
      resetToken,
      resetTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 min to reset
    })

    console.log(`[AUTH] OTP verified for ${normalizedEmail}`)

    res.status(200).json({
      success: true,
      resetToken,
      message: 'Código verificado correctamente'
    })

  } catch (error) {
    console.error('Error in verifyCode:', error)
    res.status(500).json({
      error: 'Error del servidor',
      message: 'No se pudo verificar el código'
    })
  }
}

/**
 * POST /api/auth/reset-password
 * Resets the password using the verified reset token
 */
export async function resetPassword(req, res) {
  try {
    const { email, resetToken, password } = req.body

    if (!email || !resetToken || !password) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Email, token y contraseña son requeridos'
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Contraseña débil',
        message: 'La contraseña debe tener al menos 6 caracteres'
      })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const storedOtp = otpStore.get(normalizedEmail)

    if (!storedOtp || !storedOtp.verified || storedOtp.resetToken !== resetToken) {
      return res.status(400).json({
        error: 'Token inválido',
        message: 'El token de recuperación no es válido. Inicia el proceso nuevamente.'
      })
    }

    if (new Date() > storedOtp.resetTokenExpiresAt) {
      otpStore.delete(normalizedEmail)
      return res.status(400).json({
        error: 'Token expirado',
        message: 'El token ha expirado. Inicia el proceso nuevamente.'
      })
    }

    // Find user by email using admin API
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      throw listError
    }

    const user = users.find(u => u.email?.toLowerCase() === normalizedEmail)

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No se encontró un usuario con ese correo'
      })
    }

    // Update password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: password
    })

    if (updateError) {
      throw updateError
    }

    // Clean up OTP store
    otpStore.delete(normalizedEmail)

    console.log(`[AUTH] Password reset for ${normalizedEmail}`)

    res.status(200).json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    })

  } catch (error) {
    console.error('Error in resetPassword:', error)
    res.status(500).json({
      error: 'Error del servidor',
      message: 'No se pudo actualizar la contraseña'
    })
  }
}
