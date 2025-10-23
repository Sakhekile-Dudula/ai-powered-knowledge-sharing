import { ReactNode, useEffect } from 'react'
import { Command } from 'lucide-react'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'

interface Shortcut {
  key: string
  description: string
  category: string
}

interface KeyComboProps {
  children: ReactNode
}

function KeyCombo({ children }: KeyComboProps) {
  return (
    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-slate-100 px-1.5 font-mono text-[10px] font-medium opacity-100 dark:border-slate-700 dark:bg-slate-900">
      {children}
    </kbd>
  )
}

export function KeyboardShortcuts() {
  const shortcuts: Shortcut[] = [
    { key: '⌘ K', description: 'Open quick search', category: 'Navigation' },
    { key: '⌘ 1-6', description: 'Switch tabs', category: 'Navigation' },
    { key: '⌘ E', description: 'Open experts finder', category: 'Features' },
    { key: '⌘ P', description: 'Open projects', category: 'Features' },
    { key: '⌘ /', description: 'Show shortcuts', category: 'Help' },
    { key: 'Esc', description: 'Close dialog/menu', category: 'General' },
  ]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Command/Ctrl + / to show shortcuts dialog
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        document.getElementById('show-shortcuts-btn')?.click()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          id="show-shortcuts-btn"
          variant="ghost"
          size="sm"
          className="fixed bottom-4 left-4"
        >
          <Command className="h-4 w-4 mr-2" />
          Keyboard Shortcuts
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {['Navigation', 'Features', 'General', 'Help'].map((category) => (
            <div key={category} className="mb-4">
              <h4 className="mb-2 text-sm font-medium text-slate-500">{category}</h4>
              <div className="space-y-2">
                {shortcuts
                  .filter((s) => s.category === category)
                  .map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <KeyCombo>{shortcut.key}</KeyCombo>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}