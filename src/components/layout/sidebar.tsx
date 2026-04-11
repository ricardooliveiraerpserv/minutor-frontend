'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Clock,
  FolderOpen,
  Receipt,
  CheckSquare,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BarChart2,
  CalendarClock,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { LucideIcon } from 'lucide-react'

type NavItem = {
  type: 'item'
  label: string
  href: string
  icon: LucideIcon
}

type NavGroup = {
  type: 'group'
  label: string
  icon: LucideIcon
  items: { label: string; href: string; icon: LucideIcon }[]
}

type NavEntry = NavItem | NavGroup

const NAV: NavEntry[] = [
  { type: 'item', label: 'Início',        href: '/dashboard',  icon: Home },
  { type: 'item', label: 'Apontamentos',  href: '/timesheets', icon: Clock },
  { type: 'item', label: 'Projetos',      href: '/projects',   icon: FolderOpen },
  { type: 'item', label: 'Despesas',      href: '/expenses',   icon: Receipt },
  { type: 'item', label: 'Aprovações',    href: '/approvals',  icon: CheckSquare },
  {
    type: 'group',
    label: 'Dashboards',
    icon: BarChart2,
    items: [
      { label: 'Banco de Horas Fixo',    href: '/dashboards/bank-hours-fixed',    icon: BarChart2 },
      { label: 'Banco de Horas Mensais', href: '/dashboards/bank-hours-monthly',  icon: CalendarClock },
      { label: 'On Demand',              href: '/dashboards/on-demand',            icon: Zap },
    ],
  },
  { type: 'item', label: 'Usuários',      href: '/users',      icon: Users },
  { type: 'item', label: 'Configurações', href: '/settings',   icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<string[]>(['Dashboards'])

  const toggleGroup = (label: string) => {
    setOpenGroups(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    )
  }

  const isGroupActive = (group: NavGroup) =>
    group.items.some(i => pathname === i.href || pathname.startsWith(i.href + '/'))

  return (
    <aside className={cn(
      'flex flex-col h-screen bg-zinc-900 border-r border-zinc-800 transition-all duration-200 shrink-0',
      collapsed ? 'w-14' : 'w-52'
    )}>
      {/* Logo */}
      <div className="flex items-center h-14 px-3 border-b border-zinc-800">
        {!collapsed && (
          <span className="text-white font-semibold text-sm tracking-wide">Minutor</span>
        )}
        {collapsed && (
          <span className="text-blue-500 font-bold text-lg mx-auto">M</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
        {NAV.map(entry => {
          if (entry.type === 'item') {
            const active = pathname === entry.href || pathname.startsWith(entry.href + '/')
            const Icon = entry.icon
            const item = (
              <Link
                key={entry.href}
                href={entry.href}
                className={cn(
                  'flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors',
                  active
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                )}
              >
                <Icon size={16} className="shrink-0" />
                {!collapsed && <span>{entry.label}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={entry.href}>
                  <TooltipTrigger render={item} />
                  <TooltipContent side="right">{entry.label}</TooltipContent>
                </Tooltip>
              )
            }
            return item
          }

          // Group
          const group = entry as NavGroup
          const GroupIcon = group.icon
          const active = isGroupActive(group)
          const open = openGroups.includes(group.label)

          if (collapsed) {
            return (
              <div key={group.label}>
                {group.items.map(sub => {
                  const SubIcon = sub.icon
                  const subActive = pathname === sub.href || pathname.startsWith(sub.href + '/')
                  const subItem = (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={cn(
                        'flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors',
                        subActive
                          ? 'bg-zinc-700 text-white'
                          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                      )}
                    >
                      <SubIcon size={16} className="shrink-0" />
                    </Link>
                  )
                  return (
                    <Tooltip key={sub.href}>
                      <TooltipTrigger render={subItem} />
                      <TooltipContent side="right">{sub.label}</TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            )
          }

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors',
                  active
                    ? 'text-zinc-100'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                )}
              >
                <GroupIcon size={16} className="shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown
                  size={12}
                  className={cn('transition-transform', open && 'rotate-180')}
                />
              </button>
              {open && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-zinc-800 pl-2">
                  {group.items.map(sub => {
                    const SubIcon = sub.icon
                    const subActive = pathname === sub.href || pathname.startsWith(sub.href + '/')
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                          subActive
                            ? 'bg-zinc-700 text-white'
                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                        )}
                      >
                        <SubIcon size={13} className="shrink-0" />
                        <span>{sub.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-center h-10 border-t border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  )
}
