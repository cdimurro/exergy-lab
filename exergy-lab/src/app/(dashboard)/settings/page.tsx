'use client'

import * as React from 'react'
import { Card, Button, Input, Badge } from '@/components/ui'
import { useTheme, type Theme } from '@/hooks/use-theme'
import { DataSourcesSettings } from '@/components/settings/DataSourcesSettings'
import {
  User,
  Bell,
  Lock,
  CreditCard,
  Palette,
  Globe,
  Key,
  Shield,
  Moon,
  Sun,
  Monitor,
  Check,
  Database,
} from 'lucide-react'

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'data-sources', label: 'Data Sources', icon: Database },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState('profile')
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-foreground-muted mt-1">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card className="bg-background-elevated border-border p-2">
            <nav className="space-y-1">
              {TABS.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground-muted hover:bg-background-surface hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'profile' && (
            <>
              <Card className="bg-background-elevated border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Profile Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Full Name" defaultValue="Dr. Sarah Chen" />
                  <Input label="Email" defaultValue="sarah.chen@example.com" />
                  <Input label="Organization" defaultValue="MIT Energy Initiative" />
                  <Input label="Role" defaultValue="Lead Researcher" />
                </div>
                <div className="mt-6 flex justify-end">
                  <Button variant="primary">Save Changes</Button>
                </div>
              </Card>

              <Card className="bg-background-elevated border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Avatar
                </h3>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-2xl font-semibold text-primary">SC</span>
                  </div>
                  <div>
                    <Button variant="secondary" size="sm">
                      Upload Photo
                    </Button>
                    <p className="text-xs text-foreground-subtle mt-2">
                      JPG, PNG or GIF. Max 2MB.
                    </p>
                  </div>
                </div>
              </Card>
            </>
          )}

          {activeTab === 'notifications' && (
            <Card className="bg-background-elevated border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Notification Preferences
              </h3>
              <div className="space-y-4">
                {[
                  {
                    title: 'Research Alerts',
                    description: 'New papers matching your interests',
                    enabled: true,
                  },
                  {
                    title: 'Analysis Complete',
                    description: 'When TEA calculations finish',
                    enabled: true,
                  },
                  {
                    title: 'Discovery Insights',
                    description: 'AI-generated hypotheses and findings',
                    enabled: true,
                  },
                  {
                    title: 'Data Updates',
                    description: 'When connected datasets are refreshed',
                    enabled: false,
                  },
                  {
                    title: 'Weekly Digest',
                    description: 'Summary of platform activity',
                    enabled: false,
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center justify-between p-4 rounded-lg bg-background-surface"
                  >
                    <div>
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-sm text-foreground-muted">
                        {item.description}
                      </p>
                    </div>
                    <button
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        item.enabled ? 'bg-primary' : 'bg-foreground-subtle'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          item.enabled ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <>
              <Card className="bg-background-elevated border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Change Password
                </h3>
                <div className="space-y-4 max-w-md">
                  <Input label="Current Password" type="password" />
                  <Input label="New Password" type="password" />
                  <Input label="Confirm New Password" type="password" />
                </div>
                <div className="mt-6">
                  <Button variant="primary">Update Password</Button>
                </div>
              </Card>

              <Card className="bg-background-elevated border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Two-Factor Authentication
                    </h3>
                    <p className="text-sm text-foreground-muted mt-1">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Button variant="secondary" leftIcon={<Shield className="w-4 h-4" />}>
                    Enable 2FA
                  </Button>
                </div>
              </Card>
            </>
          )}

          {activeTab === 'billing' && (
            <>
              <Card className="bg-background-elevated border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Current Plan
                </h3>
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-foreground">
                          Professional
                        </span>
                        <Badge variant="primary" size="sm">
                          Active
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground-muted mt-1">
                        $49/month • Billed monthly
                      </p>
                    </div>
                    <Button variant="secondary">Manage Subscription</Button>
                  </div>
                </div>
              </Card>

              <Card className="bg-background-elevated border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Payment Method
                </h3>
                <div className="flex items-center justify-between p-4 rounded-lg bg-background-surface">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-8 h-8 text-foreground-muted" />
                    <div>
                      <p className="font-medium text-foreground">
                        •••• •••• •••• 4242
                      </p>
                      <p className="text-sm text-foreground-muted">Expires 12/26</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Update
                  </Button>
                </div>
              </Card>
            </>
          )}

          {activeTab === 'appearance' && (
            <Card className="bg-background-elevated border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Theme
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'dark' as Theme, label: 'Dark', icon: Moon },
                  { id: 'light' as Theme, label: 'Light', icon: Sun },
                  { id: 'system' as Theme, label: 'System', icon: Monitor },
                ].map((themeOption) => {
                  const Icon = themeOption.icon
                  const isActive = theme === themeOption.id
                  return (
                    <button
                      key={themeOption.id}
                      onClick={() => setTheme(themeOption.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                        isActive
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-background-surface hover:border-foreground-subtle'
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 ${
                          isActive ? 'text-primary' : 'text-foreground-muted'
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          isActive ? 'text-primary' : 'text-foreground-muted'
                        }`}
                      >
                        {themeOption.label}
                      </span>
                      {isActive && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  )
                })}
              </div>
            </Card>
          )}

          {activeTab === 'api' && (
            <>
              <Card className="bg-background-elevated border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  API Keys
                </h3>
                <p className="text-sm text-foreground-muted mb-4">
                  Use API keys to access Exergy Lab data programmatically.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-background-surface">
                    <div>
                      <p className="font-medium text-foreground">Production Key</p>
                      <p className="text-sm text-foreground-muted font-mono">
                        exl_prod_••••••••••••••••
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success" size="sm">
                        Active
                      </Badge>
                      <Button variant="ghost" size="sm">
                        Reveal
                      </Button>
                    </div>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="mt-4"
                  leftIcon={<Key className="w-4 h-4" />}
                >
                  Generate New Key
                </Button>
              </Card>

              <Card className="bg-background-surface border-border">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-foreground-subtle" />
                  <div>
                    <p className="font-medium text-foreground">API Documentation</p>
                    <p className="text-sm text-foreground-muted">
                      Learn how to integrate with the Exergy Lab API
                    </p>
                  </div>
                </div>
              </Card>
            </>
          )}

          {activeTab === 'data-sources' && <DataSourcesSettings />}
        </div>
      </div>
    </div>
  )
}
