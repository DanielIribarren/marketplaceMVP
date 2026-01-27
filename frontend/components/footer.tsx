import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-12 px-4 mt-20">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <span className="font-bold text-xl">
                MVP<span className="text-primary">Market</span>
              </span>
            </div>
            <p className="text-sm opacity-80">
              El marketplace de confianza para comprar y vender MVPs validados
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Marketplace</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li>
                <Link href="/marketplace" className="hover:text-primary transition-colors">
                  Explorar proyectos
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-primary transition-colors">
                  Cómo funciona
                </Link>
              </li>
              <li>
                <Link href="/publish" className="hover:text-primary transition-colors">
                  Vender MVP
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Recursos</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Guías
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Casos de éxito
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Términos de uso
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Privacidad
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary transition-colors">
                  Contacto
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 text-center text-sm opacity-80">
          <p>&copy; 2025 MVPMarket. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
