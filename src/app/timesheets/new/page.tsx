'use client'
import { AppLayout } from '@/components/layout/app-layout'
import { Clock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewTimesheetPage() {
  return (
    <AppLayout
      title="Novo Apontamento"
      actions={
        <Link
          href="/timesheets"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft size={12} />
          Voltar
        </Link>
      }
    >
      <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
        <Clock size={32} className="mb-3 opacity-30" />
        <p className="text-sm">Em breve</p>
      </div>
    </AppLayout>
  )
}
