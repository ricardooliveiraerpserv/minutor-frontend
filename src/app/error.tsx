'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
      <div className="max-w-xl w-full space-y-4">
        <div className="rounded-lg border border-red-800 bg-red-950/30 p-4">
          <p className="text-sm font-semibold text-red-400 mb-2">Erro na aplicação</p>
          <p className="text-xs text-red-300 font-mono break-all">{error.message}</p>
          {error.digest && (
            <p className="text-[11px] text-red-500 mt-1">digest: {error.digest}</p>
          )}
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 overflow-auto max-h-64">
          <p className="text-[11px] text-zinc-500 mb-2 font-medium uppercase tracking-wide">Stack trace</p>
          <pre className="text-[10px] text-zinc-400 whitespace-pre-wrap break-all leading-relaxed">
            {error.stack}
          </pre>
        </div>

        <button
          onClick={reset}
          className="w-full py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
