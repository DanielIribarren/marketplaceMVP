import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border/70 bg-ink-900 text-background py-12 px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 orange-grid opacity-[0.07]" />
      <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-brand-500/15 blur-3xl" />
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 flex items-center justify-center shadow-sm shadow-brand-500/40">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <span className="font-bold text-xl">
                MVP<span className="text-primary">Market</span>
              </span>
            </div>
            <p className="text-sm text-background/80">
              El marketplace de confianza para comprar y vender MVPs validados
            </p>
          </div>

          <div className="relative">
            <h4 className="font-semibold mb-4">Marketplace</h4>
            <ul className="space-y-2 text-sm text-background/80">
              <li>
                <Link href="/marketplace" className="hover:text-primary transition-colors duration-200">
                  Explorar proyectos
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-primary transition-colors duration-200">
                  Cómo funciona
                </Link>
              </li>
              <li>
                <Link href="/publish" className="hover:text-primary transition-colors duration-200">
                  Vender MVP
                </Link>
              </li>
            </ul>
          </div>

          <div className="relative">
            <h4 className="font-semibold mb-4">Recursos</h4>
            <ul className="space-y-2 text-sm text-background/80">
              <li>
                <a href="#" className="hover:text-primary transition-colors duration-200">
                  Guías
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors duration-200">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors duration-200">
                  Casos de éxito
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors duration-200">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div className="relative">
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-background/80">
              <li>
                <a href="#" className="hover:text-primary transition-colors duration-200">
                  Términos de uso
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors duration-200">
                  Privacidad
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors duration-200">
                  Contacto
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="relative border-t border-white/10 pt-8 text-center text-sm text-background/80">
          <p>&copy; 2025 MVPMarket. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
