'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  FlaskConical,
  Bot,
  Calculator,
  ArrowRight,
  Sparkles,
  FileText,
  Bookmark,
  Download,
} from 'lucide-react'
import { useWorkflowContext } from '@/lib/store/workflow-context'

// ============================================================================
// Types
// ============================================================================

interface WorkflowBridgeProps {
  context: {
    type: 'paper' | 'experiment' | 'simulation'
    data: PaperContext | ExperimentContext | SimulationContext
  }
  variant?: 'buttons' | 'dropdown' | 'inline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

interface PaperContext {
  id: string
  title: string
  authors: Array<{ name: string }>
  year: number
  abstract?: string
  doi?: string
  extractedParameters?: Record<string, number>
  methodology?: string
}

interface ExperimentContext {
  id: string
  title: string
  domain: string
  materials: Array<{ name: string; quantity: number; unit: string }>
  parameters: Record<string, number>
  expectedOutcomes?: string[]
}

interface SimulationContext {
  id: string
  title: string
  domain: string
  metrics: Record<string, number>
  recommendations?: string[]
}

// ============================================================================
// Component
// ============================================================================

export function WorkflowBridge({
  context,
  variant = 'buttons',
  size = 'md',
  className = '',
}: WorkflowBridgeProps) {
  const router = useRouter()
  const { addSourcePaper, setExperimentContext, setSimulationContext } = useWorkflowContext()

  // Determine available workflow actions based on context type
  const getAvailableActions = () => {
    switch (context.type) {
      case 'paper':
        return [
          {
            id: 'experiment',
            label: 'Design Experiment',
            icon: FlaskConical,
            color: 'emerald',
            description: 'Create an experiment protocol based on this paper',
          },
          {
            id: 'simulation',
            label: 'Run Simulation',
            icon: Bot,
            color: 'blue',
            description: 'Simulate parameters from this research',
          },
          {
            id: 'save',
            label: 'Save to Library',
            icon: Bookmark,
            color: 'amber',
            description: 'Add to your personal library',
          },
        ]
      case 'experiment':
        return [
          {
            id: 'simulation',
            label: 'Run Simulation',
            icon: Bot,
            color: 'blue',
            description: 'Validate experiment with simulation',
          },
          {
            id: 'tea',
            label: 'Generate TEA',
            icon: Calculator,
            color: 'purple',
            description: 'Techno-economic analysis',
          },
          {
            id: 'export',
            label: 'Export Protocol',
            icon: Download,
            color: 'zinc',
            description: 'Download experiment file',
          },
        ]
      case 'simulation':
        return [
          {
            id: 'tea',
            label: 'Generate TEA',
            icon: Calculator,
            color: 'purple',
            description: 'Full economic analysis',
          },
          {
            id: 'report',
            label: 'Download Report',
            icon: FileText,
            color: 'zinc',
            description: 'PDF simulation report',
          },
          {
            id: 'refine',
            label: 'Refine & Re-run',
            icon: Sparkles,
            color: 'amber',
            description: 'Optimize parameters',
          },
        ]
      default:
        return []
    }
  }

  const handleAction = (actionId: string) => {
    switch (actionId) {
      case 'experiment':
        if (context.type === 'paper') {
          const paper = context.data as PaperContext
          addSourcePaper({
            id: paper.id,
            title: paper.title,
            authors: paper.authors.map((a) => a.name),
            year: paper.year,
            abstract: paper.abstract,
            doi: paper.doi,
            extractedParameters: paper.extractedParameters,
            methodology: paper.methodology || paper.abstract,
          })
        }
        router.push('/experiments')
        break

      case 'simulation':
        if (context.type === 'paper') {
          const paper = context.data as PaperContext
          addSourcePaper({
            id: paper.id,
            title: paper.title,
            authors: paper.authors.map((a) => a.name),
            year: paper.year,
            abstract: paper.abstract,
            doi: paper.doi,
            extractedParameters: paper.extractedParameters,
            methodology: paper.methodology,
          })
        } else if (context.type === 'experiment') {
          const exp = context.data as ExperimentContext
          setExperimentContext({
            id: exp.id,
            title: exp.title,
            domain: exp.domain,
            description: '',
            materials: exp.materials.map((m) => ({
              name: m.name,
              quantity: String(m.quantity),
              unit: m.unit,
            })),
            parameters: exp.parameters,
            expectedOutcomes: exp.expectedOutcomes,
          })
        }
        router.push('/simulations')
        break

      case 'tea':
        if (context.type === 'simulation') {
          const sim = context.data as SimulationContext
          setSimulationContext({
            id: sim.id,
            type: sim.title,
            domain: sim.domain,
            metrics: sim.metrics,
            recommendations: sim.recommendations,
          })
        } else if (context.type === 'experiment') {
          const exp = context.data as ExperimentContext
          setExperimentContext({
            id: exp.id,
            title: exp.title,
            domain: exp.domain,
            description: '',
            materials: exp.materials.map((m) => ({
              name: m.name,
              quantity: String(m.quantity),
              unit: m.unit,
            })),
            parameters: exp.parameters,
            expectedOutcomes: exp.expectedOutcomes,
          })
        }
        router.push('/tea-generator')
        break

      case 'save':
        // This would trigger a save to library action
        console.log('Save to library:', context.data)
        break

      case 'export':
        // This would trigger a download
        console.log('Export:', context.data)
        break

      case 'report':
        // This would trigger PDF generation
        console.log('Generate report:', context.data)
        break

      case 'refine':
        // Stay on simulations page but open refinement mode
        console.log('Refine simulation:', context.data)
        break
    }
  }

  const actions = getAvailableActions()

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-1.5',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2.5',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  // Color classes
  const getColorClasses = (color: string, isPrimary: boolean) => {
    if (isPrimary) {
      switch (color) {
        case 'emerald':
          return 'bg-emerald-600 hover:bg-emerald-500 text-white'
        case 'blue':
          return 'bg-blue-600 hover:bg-blue-500 text-white'
        case 'purple':
          return 'bg-purple-600 hover:bg-purple-500 text-white'
        case 'amber':
          return 'bg-amber-600 hover:bg-amber-500 text-white'
        default:
          return 'bg-zinc-600 hover:bg-zinc-500 text-white'
      }
    }
    return 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
  }

  // Render based on variant
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {actions.map((action, index) => {
          const Icon = action.icon
          const isPrimary = index === 0

          return (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className={`
                inline-flex items-center gap-1.5 rounded-lg transition-colors
                ${sizeClasses[size]}
                ${getColorClasses(action.color, isPrimary)}
              `}
              title={action.description}
            >
              <Icon className={iconSizes[size]} />
              <span>{action.label}</span>
              {isPrimary && <ArrowRight className={iconSizes[size]} />}
            </button>
          )
        })}
      </div>
    )
  }

  if (variant === 'dropdown') {
    return (
      <div className={`relative group ${className}`}>
        <button
          className={`
            inline-flex items-center gap-2 rounded-lg transition-colors
            ${sizeClasses[size]}
            bg-emerald-600 hover:bg-emerald-500 text-white
          `}
        >
          <Sparkles className={iconSizes[size]} />
          <span>Workflow</span>
          <ArrowRight className={iconSizes[size]} />
        </button>

        <div className="absolute right-0 mt-2 w-56 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          {actions.map((action) => {
            const Icon = action.icon

            return (
              <button
                key={action.id}
                onClick={() => handleAction(action.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                <Icon className={`${iconSizes[size]} text-${action.color}-500`} />
                <div>
                  <div className="text-sm text-white">{action.label}</div>
                  <div className="text-xs text-zinc-400">{action.description}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Default: buttons variant
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Primary actions */}
      <div className="grid grid-cols-2 gap-2">
        {actions.slice(0, 2).map((action, index) => {
          const Icon = action.icon
          const isPrimary = index === 0

          return (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              className={`
                flex items-center justify-center gap-2 rounded-lg transition-colors
                ${sizeClasses[size]}
                ${getColorClasses(action.color, isPrimary)}
              `}
              title={action.description}
            >
              <Icon className={iconSizes[size]} />
              <span>{action.label}</span>
            </button>
          )
        })}
      </div>

      {/* Secondary actions */}
      {actions.length > 2 && (
        <div className="flex items-center gap-2">
          {actions.slice(2).map((action) => {
            const Icon = action.icon

            return (
              <button
                key={action.id}
                onClick={() => handleAction(action.id)}
                className={`
                  flex-1 flex items-center justify-center gap-2 rounded-lg transition-colors
                  ${sizeClasses[size]}
                  bg-zinc-700 hover:bg-zinc-600 text-zinc-300
                `}
                title={action.description}
              >
                <Icon className={iconSizes[size]} />
                <span>{action.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Compact variant for inline use
// ============================================================================

interface WorkflowButtonProps {
  action: 'experiment' | 'simulation' | 'tea' | 'save'
  context: WorkflowBridgeProps['context']
  size?: 'sm' | 'md'
  className?: string
}

export function WorkflowButton({ action, context, size = 'sm', className = '' }: WorkflowButtonProps) {
  const router = useRouter()
  const { addSourcePaper } = useWorkflowContext()

  const config = {
    experiment: { icon: FlaskConical, label: 'Experiment', color: 'emerald', path: '/experiments' },
    simulation: { icon: Bot, label: 'Simulate', color: 'blue', path: '/simulations' },
    tea: { icon: Calculator, label: 'TEA', color: 'purple', path: '/tea-generator' },
    save: { icon: Bookmark, label: 'Save', color: 'amber', path: '' },
  }

  const { icon: Icon, label, color, path } = config[action]

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5'
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  const handleClick = () => {
    // Set context based on type
    if (context.type === 'paper' && (action === 'experiment' || action === 'simulation')) {
      const paper = context.data as PaperContext
      addSourcePaper({
        id: paper.id,
        title: paper.title,
        authors: paper.authors.map((a) => a.name),
        year: paper.year,
        abstract: paper.abstract,
        doi: paper.doi,
        extractedParameters: paper.extractedParameters,
        methodology: paper.methodology,
      })
    }

    if (path) {
      router.push(path)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center gap-1 rounded transition-colors
        ${sizeClasses}
        bg-${color}-600/20 hover:bg-${color}-600/30 text-${color}-400
        ${className}
      `}
    >
      <Icon className={iconSize} />
      <span>{label}</span>
      <ArrowRight className={iconSize} />
    </button>
  )
}
