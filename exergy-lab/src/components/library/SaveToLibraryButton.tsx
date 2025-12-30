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
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useLibraryStore } from '@/lib/library'
import type {
  LibraryItemType,
  LibraryItemData,
  LibraryFolder,
} from '@/lib/library/library-types'

// ============================================================================
// Types
// ============================================================================

interface SaveToLibraryButtonProps {
  itemType: LibraryItemType
  title: string
  data: LibraryItemData
  variant?: 'default' | 'ghost' | 'outline' | 'icon'
  size?: 'default' | 'sm' | 'lg' | 'icon'
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
  size = 'icon',
  className,
  onSaved,
}: SaveToLibraryButtonProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const { folders, saveItem, createFolder } = useLibraryStore()

  // Build folder tree for display
  const rootFolders = folders.filter((f) => f.parentId === null)

  const handleQuickSave = () => {
    const item = saveItem(itemType, title, data)
    setIsSaved(true)
    onSaved?.(item.id)

    // Reset after animation
    setTimeout(() => setIsSaved(false), 2000)
  }

  const handleSaveToFolder = (folderId: string | null) => {
    const item = saveItem(itemType, title, data, { folderId })
    setIsSaved(true)
    onSaved?.(item.id)

    setTimeout(() => setIsSaved(false), 2000)
  }

  const handleOpenDialog = () => {
    setIsDialogOpen(true)
  }

  const handleCreateFolderAndSave = () => {
    if (!newFolderName.trim()) return

    const folder = createFolder(newFolderName.trim())
    const item = saveItem(itemType, title, data, {
      folderId: folder.id,
      tags,
    })

    setIsSaved(true)
    setIsDialogOpen(false)
    setNewFolderName('')
    setTags([])
    onSaved?.(item.id)

    setTimeout(() => setIsSaved(false), 2000)
  }

  const handleSaveWithOptions = () => {
    const item = saveItem(itemType, title, data, {
      folderId: selectedFolderId,
      tags,
    })

    setIsSaved(true)
    setIsDialogOpen(false)
    setSelectedFolderId(null)
    setTags([])
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

  // Icon-only button
  if (size === 'icon' || variant === 'icon') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={className}
            aria-label={isSaved ? 'Saved to library' : 'Save to library'}
          >
            {isSaved ? (
              <BookmarkCheck className="h-4 w-4 text-green-500" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Save to Library</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleQuickSave}>
            <Bookmark className="mr-2 h-4 w-4" />
            Quick Save
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Folders
          </DropdownMenuLabel>
          {rootFolders.length === 0 ? (
            <DropdownMenuItem disabled className="text-muted-foreground">
              No folders yet
            </DropdownMenuItem>
          ) : (
            rootFolders.map((folder) => (
              <DropdownMenuItem
                key={folder.id}
                onClick={() => handleSaveToFolder(folder.id)}
              >
                <span
                  className="mr-2 h-3 w-3 rounded-sm"
                  style={{ backgroundColor: folder.color ? `var(--${folder.color})` : '#6B7280' }}
                />
                {folder.name}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleOpenDialog}>
            <FolderPlus className="mr-2 h-4 w-4" />
            Save with options...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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

      {/* Save with options dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save to Library</DialogTitle>
            <DialogDescription>
              Choose a folder and add tags to organize your saved item.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Item preview */}
            <div className="rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{itemType}</Badge>
                <span className="text-sm font-medium line-clamp-1">{title}</span>
              </div>
            </div>

            {/* Folder selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Folder</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {selectedFolderId
                      ? folders.find((f) => f.id === selectedFolderId)?.name
                      : 'No folder (root)'}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  <DropdownMenuItem onClick={() => setSelectedFolderId(null)}>
                    No folder (root)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {rootFolders.map((folder) => (
                    <DropdownMenuItem
                      key={folder.id}
                      onClick={() => setSelectedFolderId(folder.id)}
                    >
                      {folder.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Create new folder */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Or create new folder</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={handleCreateFolderAndSave}
                  disabled={!newFolderName.trim()}
                >
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
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button variant="secondary" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag}
                      <span className="ml-1">×</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveWithOptions}>
              <Bookmark className="mr-2 h-4 w-4" />
              Save to Library
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
