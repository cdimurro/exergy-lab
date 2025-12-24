'use client'

import * as React from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export interface DynamicFieldArrayProps<T> {
  label: string
  fields: T[]
  onAdd: () => void
  onRemove: (index: number) => void
  renderRow: (field: T, index: number, onChange: (index: number, field: T) => void) => React.ReactNode
  onChange: (index: number, field: T) => void
  addButtonText?: string
  emptyMessage?: string
  maxItems?: number
  minItems?: number
}

export function DynamicFieldArray<T>({
  label,
  fields,
  onAdd,
  onRemove,
  renderRow,
  onChange,
  addButtonText = 'Add Row',
  emptyMessage = 'No items added yet',
  maxItems,
  minItems = 0,
}: DynamicFieldArrayProps<T>) {
  const canAdd = maxItems === undefined || fields.length < maxItems
  const canRemove = fields.length > minItems

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">{label}</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          disabled={!canAdd}
          className="text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          {addButtonText}
          {maxItems && ` (${fields.length}/${maxItems})`}
        </Button>
      </div>

      {fields.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted">{emptyMessage}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAdd}
            className="mt-3"
          >
            <Plus className="w-3 h-3 mr-1" />
            {addButtonText}
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <Card key={index} className="p-4">
              <div className="flex gap-3">
                <div className="flex items-start gap-2 flex-shrink-0">
                  <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs font-medium text-primary mt-2">
                    {index + 1}
                  </div>
                  <div className="cursor-move text-muted mt-2">
                    <GripVertical className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  {renderRow(field, index, onChange)}
                </div>

                <div className="flex-shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(index)}
                    disabled={!canRemove}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {minItems > 0 && fields.length < minItems && (
        <p className="text-xs text-amber-500">
          At least {minItems} {minItems === 1 ? 'item is' : 'items are'} required
        </p>
      )}
    </div>
  )
}
