'use client'

import { useState, useEffect, useRef } from 'react'
import { MoreVertical } from 'lucide-react'

export interface RowMenuItem {
  label: string
  icon: React.ReactNode
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}

export function RowMenu({ items }: { items: RowMenuItem[] }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const ref    = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const open   = pos !== null

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setPos(null)
    }
    function onScroll() { setPos(null) }
    document.addEventListener('mousedown', handler)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', onScroll)
    }
  }, [open])

  if (items.length === 0) return null

  function toggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (open) { setPos(null); return }
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const dropH = items.length * 36 + 8
    const up = r.bottom + dropH > window.innerHeight
    setPos({ left: r.right + 4, top: up ? r.top - dropH : r.top })
  }

  return (
    <div ref={ref}>
      <button
        ref={btnRef}
        onClick={toggle}
        className={`p-1.5 rounded transition-colors ${
          open ? 'text-zinc-200 bg-zinc-700' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
        }`}
      >
        <MoreVertical size={14} />
      </button>
      {pos && (
        <div
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="min-w-[160px] bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl py-1 overflow-hidden"
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { if (!item.disabled) { item.onClick(); setPos(null) } }}
              disabled={item.disabled}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed ${
                item.danger
                  ? 'text-red-400 hover:bg-red-500/10'
                  : 'text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
