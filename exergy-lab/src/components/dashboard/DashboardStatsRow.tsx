/**
 * DashboardStatsRow Component
 *
 * Displays 5 stat cards showing counts for each feature area.
 */

'use client'

import { Search, FlaskConical, Bot, Calculator, Cpu } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface DashboardStatsRowProps {
  searches: number
  experiments: number
  simulations: number
  teaReports: number
  discoveries: number
}

interface StatCardProps {
  label: string
  count: number
  icon: React.ComponentType<{ className?: string }>
  colorClass: string
  bgClass: string
}

function StatCard({ label, count, icon: Icon, colorClass, bgClass }: StatCardProps) {
  return (
    <Card className="hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-foreground-muted mb-1">{label}</p>
          <p className="text-2xl font-bold text-foreground">{count}</p>
        </div>
        <div className={`p-3 rounded-xl ${bgClass}`}>
          <Icon className={`w-6 h-6 ${colorClass}`} />
        </div>
      </div>
    </Card>
  )
}

export function DashboardStatsRow({
  searches,
  experiments,
  simulations,
  teaReports,
  discoveries,
}: DashboardStatsRowProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard
        label="Searches"
        count={searches}
        icon={Search}
        colorClass="text-accent-blue"
        bgClass="bg-accent-blue/10"
      />
      <StatCard
        label="Experiments"
        count={experiments}
        icon={FlaskConical}
        colorClass="text-accent-purple"
        bgClass="bg-accent-purple/10"
      />
      <StatCard
        label="Simulations"
        count={simulations}
        icon={Bot}
        colorClass="text-accent-amber"
        bgClass="bg-accent-amber/10"
      />
      <StatCard
        label="TEA Reports"
        count={teaReports}
        icon={Calculator}
        colorClass="text-accent-cyan"
        bgClass="bg-accent-cyan/10"
      />
      <StatCard
        label="Discoveries"
        count={discoveries}
        icon={Cpu}
        colorClass="text-accent-rose"
        bgClass="bg-accent-rose/10"
      />
    </div>
  )
}
