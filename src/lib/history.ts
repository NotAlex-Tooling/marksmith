// Undo/redo history manager using deep-cloned tree snapshots.

import type { HistoryEntry, Folder } from './types';
import { deepClone } from './tree-utils';

const MAX_HISTORY = 50;

// Bounded undo/redo stack of cloned bookmark-tree snapshots.
export class HistoryManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];

  // Saves the current state to the undo stack and clears the redo stack.
  push(roots: Folder[], selectedId: string | null): void {
    this.undoStack.push(deepClone({ roots, selectedId }));
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  // Restores the previous snapshot, pushing the current one onto redo.
  undo(currentRoots: Folder[], currentSelectedId: string | null): HistoryEntry | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    this.redoStack.push(deepClone({ roots: currentRoots, selectedId: currentSelectedId }));
    return deepClone(entry);
  }

  // Restores the next snapshot, pushing the current one onto undo.
  redo(currentRoots: Folder[], currentSelectedId: string | null): HistoryEntry | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    this.undoStack.push(deepClone({ roots: currentRoots, selectedId: currentSelectedId }));
    return deepClone(entry);
  }

  // Returns whether an undo step is available.
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  // Returns whether a redo step is available.
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  // Clears both stacks.
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
