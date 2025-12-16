'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Avatar, Badge, Button } from '@/components/ui'
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  User,
} from 'lucide-react'

interface HeaderProps {
  sidebarCollapsed?: boolean
}

export function Header({ sidebarCollapsed = false }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = React.useState(false)
  const [showNotifications, setShowNotifications] = React.useState(false)

  // Mock user data - replace with actual auth
  const user = {
    name: 'Dr. Sarah Chen',
    role: 'Lead Researcher',
    email: 'sarah@exergylab.com',
    avatar: null,
  }

  // Mock notifications
  const notifications = [
    {
      id: '1',
      title: 'Solar Efficiency Spike',
      message: 'New perovskite data suggests 2% gain in EU region',
      time: '2h ago',
      unread: true,
    },
    {
      id: '2',
      title: 'Grid Load Warning',
      message: 'Predicted instability in North American sector',
      time: '4h ago',
      unread: true,
    },
    {
      id: '3',
      title: 'Hydrogen Cost Drop',
      message: 'Electrolysis efficiency updated to 78%',
      time: '6h ago',
      unread: false,
    },
  ]

  const unreadCount = notifications.filter((n) => n.unread).length

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 h-16 bg-background-surface/95 backdrop-blur-md border-b border-border transition-all duration-300',
        sidebarCollapsed ? 'left-20' : 'left-72'
      )}
    >
      <div className="flex items-center justify-between h-full px-6">
        {/* Search */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
            <input
              type="text"
              placeholder="Search solutions, experiments, or datasets..."
              className="w-full h-10 pl-10 pr-20 bg-input-background border border-input-border rounded-lg text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs text-foreground-muted bg-background rounded border border-border">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4 ml-6">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications)
                setShowUserMenu(false)
              }}
              className="relative p-2 rounded-lg hover:bg-background-elevated text-foreground-muted hover:text-foreground transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
              )}
            </button>

            {/* Notifications dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-background border border-border rounded-xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">
                    Notifications
                  </h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'px-4 py-3 hover:bg-background-surface cursor-pointer border-b border-border last:border-0',
                        notification.unread && 'bg-primary/10'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {notification.unread && (
                          <span className="w-2 h-2 mt-1.5 bg-primary rounded-full shrink-0" />
                        )}
                        <div className={cn(!notification.unread && 'ml-5')}>
                          <p className="text-sm font-medium text-foreground">
                            {notification.title}
                          </p>
                          <p className="text-xs text-foreground-muted mt-0.5">
                            {notification.message}
                          </p>
                          <p className="text-xs text-foreground-subtle mt-1">
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-border">
                  <button className="text-sm text-primary hover:underline">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu)
                setShowNotifications(false)
              }}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-background-elevated transition-colors"
            >
              <Avatar src={user.avatar} fallback={user.name} size="sm" />
              <div className="text-left hidden lg:block">
                <p className="text-sm font-medium text-foreground">
                  {user.name}
                </p>
                <p className="text-xs text-foreground-muted">{user.role}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-foreground-muted hidden lg:block" />
            </button>

            {/* User dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-background border border-border rounded-xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-medium text-foreground">
                    {user.name}
                  </p>
                  <p className="text-xs text-foreground-muted">{user.email}</p>
                  <Badge variant="primary" size="sm" className="mt-2">
                    Free Plan
                  </Badge>
                </div>
                <div className="py-2">
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground-muted hover:text-foreground hover:bg-background-surface transition-colors">
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground-muted hover:text-foreground hover:bg-background-surface transition-colors">
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                </div>
                <div className="py-2 border-t border-border">
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside handler */}
      {(showUserMenu || showNotifications) && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => {
            setShowUserMenu(false)
            setShowNotifications(false)
          }}
        />
      )}
    </header>
  )
}
