'use client'

/**
 * SaveToLibraryButton Component (v0.0.5)
 *
 * Reusable button for saving items to the personal library.
 * Appears on paper cards, reports, discovery results, etc.
 */

import * as React from 'react'
import { useState } from 'react'
import {
  Bookmark,
  BookmarkCheck,
  FolderPlus,
  Check,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { useLibraryStore } from '@/lib/library'
import type {
  LibraryItemType,
  LibraryItemData,
} from '@/lib/library/library-types'

// ============================================================================
// Types
// ============================================================================

interface SaveToLibraryButtonProps {
  itemType: LibraryItemType
  title: string
  data: LibraryItemData
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  iconOnly?: boolean
  className?: string
  onSaved?: (itemId: string) => void
}

// ============================================================================
// Component
// ============================================================================

export function SaveToLibraryButton({
  itemType,
  title,
  data,
  variant = 'ghost',
  size = 'sm',
  iconOnly = true,
  className,
  onSaved,
}: SaveToLibraryButtonProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const { folders, saveItem, createFolder } = useLibraryStore()

  // Build folder list for display
  const rootFolders = folders.filter((f) => f.parentId === null)

  const handleQuickSave = () => {
    const item = saveItem(itemType, title, data)
    setIsSaved(true)
    onSaved?.(item.id)

    // Reset after animation
    setTimeout(() => setIsSaved(false), 2000)
  }

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedFolderId(null)
    setNewFolderName('')
    setTags([])
    setTagInput('')
  }

  const handleCreateFolderAndSave = () => {
    if (!newFolderName.trim()) return

    const folder = createFolder(newFolderName.trim())
    const item = saveItem(itemType, title, data, {
      folderId: folder.id,
      tags,
    })

    setIsSaved(true)
    handleCloseModal()
    onSaved?.(item.id)

    setTimeout(() => setIsSaved(false), 2000)
  }

  const handleSaveWithOptions = () => {
    const item = saveItem(itemType, title, data, {
      folderId: selectedFolderId,
      tags,
    })

    setIsSaved(true)
    handleCloseModal()
    onSaved?.(item.id)

    setTimeout(() => setIsSaved(false), 2000)
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  // Icon-only button with quick save
  if (iconOnly) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          className={`p-2 h-8 w-8 ${className || ''}`}
          onClick={handleQuickSave}
          onContextMenu={(e) => {
            e.preventDefault()
            handleOpenModal()
          }}
          title={isSaved ? 'Saved to library' : 'Save to library (right-click for options)'}
          aria-label={isSaved ? 'Saved to library' : 'Save to library'}
        >
          {isSaved ? (
            <BookmarkCheck className="h-4 w-4 text-green-500" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </Button>

        <SaveModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={title}
          itemType={itemType}
          folders={rootFolders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          newFolderName={newFolderName}
          onNewFolderNameChange={setNewFolderName}
          tags={tags}
          tagInput={tagInput}
          onTagInputChange={setTagInput}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          onKeyDown={handleKeyDown}
          onCreateFolderAndSave={handleCreateFolderAndSave}
          onSaveWithOptions={handleSaveWithOptions}
        />
      </>
    )
  }

  // Regular button
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleQuickSave}
      >
        {isSaved ? (
          <>
            <Check className="mr-2 h-4 w-4 text-green-500" />
            Saved
          </>
        ) : (
          <>
            <Bookmark className="mr-2 h-4 w-4" />
            Save
          </>
        )}
      </Button>
    </>
  )
}

// ============================================================================
// Save Modal Component
// ============================================================================

interface SaveModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  itemType: LibraryItemType
  folders: Array<{ id: string; name: string; color?: string }>
  selectedFolderId: string | null
  onSelectFolder: (id: string | null) => void
  newFolderName: string
  onNewFolderNameChange: (name: string) => void
  tags: string[]
  tagInput: string
  onTagInputChange: (value: string) => void
  onAddTag: () => void
  onRemoveTag: (tag: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onCreateFolderAndSave: () => void
  onSaveWithOptions: () => void
}

function SaveModal({
  isOpen,
  onClose,
  title,
  itemType,
  folders,
  selectedFolderId,
  onSelectFolder,
  newFolderName,
  onNewFolderNameChange,
  tags,
  tagInput,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  onKeyDown,
  onCreateFolderAndSave,
  onSaveWithOptions,
}: SaveModalProps) {
  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save to Library">
      <div className="space-y-4">
        {/* Item preview */}
        <div className="rounded-md border p-3 bg-muted/50">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{itemType}</Badge>
            <span className="text-sm font-medium line-clamp-1">{title}</span>
          </div>
        </div>

        {/* Folder selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Folder</label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedFolderId === null ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onSelectFolder(null)}
            >
              No folder (root)
            </Button>
            {folders.map((folder) => (
              <Button
                key={folder.id}
                variant={selectedFolderId === folder.id ? 'primary' : 'outline'}
                size="sm"
                onClick={() => onSelectFolder(folder.id)}
              >
                {folder.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Create new folder */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Or create new folder</label>
          <div className="flex gap-2">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => onNewFolderNameChange(e.target.value)}
            />
            <Button
              variant="secondary"
              onClick={onCreateFolderAndSave}
              disabled={!newFolderName.trim()}
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              Create & Save
            </Button>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Tags</label>
          <div className="flex gap-2">
            <Input
              placeholder="Add tag..."
              value={tagInput}
              onChange={(e) => onTagInputChange(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <Button variant="secondary" onClick={onAddTag}>
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => onRemoveTag(tag)}
                >
                  {tag}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSaveWithOptions}>
            <Bookmark className="mr-2 h-4 w-4" />
            Save to Library
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ============================================================================
// Compact Version
// ============================================================================

interface SaveButtonCompactProps {
  itemType: LibraryItemType
  title: string
  data: LibraryItemData
  className?: string
}

export function SaveButtonCompact({
  itemType,
  title,
  data,
  className,
}: SaveButtonCompactProps) {
  const [isSaved, setIsSaved] = useState(false)
  const { saveItem } = useLibraryStore()

  const handleSave = () => {
    saveItem(itemType, title, data)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  return (
    <button
      onClick={handleSave}
      className={`inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors ${className}`}
      aria-label={isSaved ? 'Saved' : 'Save to library'}
    >
      {isSaved ? (
        <>
          <BookmarkCheck className="h-4 w-4 text-green-500" />
          <span className="text-green-500">Saved</span>
        </>
      ) : (
        <>
          <Bookmark className="h-4 w-4" />
          <span>Save</span>
        </>
      )}
    </button>
  )
}

export default SaveToLibraryButton
