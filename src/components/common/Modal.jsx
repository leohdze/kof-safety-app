import { useEffect } from 'react'

/**
 * Modal responsivo:
 * - Móvil  (<md): bottom sheet que sube desde abajo, respeta safe-area-inset-bottom.
 * - Desktop (≥md): tarjeta centrada con backdrop.
 *
 * El body.overflow se bloquea mientras el modal está abierto para evitar
 * scroll del documento detrás del overlay.
 */
export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  // Ancho máximo — sólo aplica en desktop (md+)
  const mdWidths = {
    sm: 'md:max-w-md',
    md: 'md:max-w-xl',
    lg: 'md:max-w-2xl',
    xl: 'md:max-w-3xl',
  }

  return (
    /*
     * Contenedor del overlay:
     * - Móvil:   flex-col justify-end  → el modal se ancla al borde inferior
     * - Desktop: items-center justify-center + padding → modal centrado
     */
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center md:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/*
       * Tarjeta del modal:
       * - Móvil:   ancho completo, esquinas redondeadas arriba, max-h-modal,
       *            padding inferior = safe-area-inset-bottom.
       * - Desktop: ancho limitado por mdWidths, redondeado en todas las esquinas.
       */}
      <div
        className={[
          'relative w-full flex flex-col',
          // Altura máxima: 85dvh en ambos contextos
          'max-h-modal',
          // Esquinas: top-only en móvil, todas en desktop
          'rounded-t-2xl md:rounded-2xl',
          // Sombra y fondo
          'bg-white shadow-2xl',
          // Ancho máximo en desktop
          mdWidths[size],
        ].join(' ')}
      >
        {/* Indicador de arrastre — solo móvil */}
        <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Cabecera del modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-xl hover:bg-gray-100"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/*
         * Cuerpo scrolleable.
         * pb-safe asegura que el contenido no quede debajo del indicador home
         * en iPhones sin botón de inicio.
         */}
        <div
          className="overflow-y-auto flex-1 px-6 py-5 pb-safe"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
