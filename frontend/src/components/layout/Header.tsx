import { Bell, Search, User } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="flex items-center justify-between h-16 px-6 bg-surface border-b border-border">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
        {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search..."
            className="input pl-9 w-64"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-surface-elevated transition-colors">
          <Bell className="w-5 h-5 text-text-secondary" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        </button>

        {/* User Menu */}
        <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-elevated transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
        </button>
      </div>
    </header>
  )
}
