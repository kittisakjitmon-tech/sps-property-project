/**
 * ProtectedImageContainer
 * - ป้องกันคลิกขวา/ลากรูป
 * - แสดงลายน้ำแบบจางทับทั้งภาพ
 */
export default function ProtectedImageContainer({
  children,
  propertyId = null,
  className = '',
}) {
  const handleContextMenu = (e) => {
    e.preventDefault()
  }

  const handleDragStart = (e) => {
    e.preventDefault()
  }

  return (
    <div
      className={`protected-image-container relative overflow-hidden ${className}`}
      onContextMenu={handleContextMenu}
    >
      {/* Image Container - z-0 (lowest) */}
      <div
        className="absolute inset-0 z-0 [&_img]:select-none [&_img]:[touch-action:none]"
        onDragStart={handleDragStart}
      >
        {children}
      </div>

      {/* Protection Layer - z-[1] (middle) */}
      <div
        className="absolute inset-0 z-[1] pointer-events-auto select-none"
        onContextMenu={handleContextMenu}
        aria-hidden
      />

      {/* Watermark Layer - z-[2] (top) */}
      <div className="absolute inset-0 z-[2] pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -18deg,
              transparent,
              transparent 52px,
              rgba(255,255,255,0.22) 52px,
              rgba(255,255,255,0.22) 54px
            )`,
          }}
        />
        <div
          className="absolute right-2 bottom-2 left-2 text-right"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.8)' }}
        >
          <span className="text-[10px] sm:text-xs text-white font-semibold">
            SPS Property Solution {propertyId ? ` | ${propertyId}` : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
