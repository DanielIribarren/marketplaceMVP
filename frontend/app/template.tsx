"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"

export default function Template({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.18, 0.95, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
