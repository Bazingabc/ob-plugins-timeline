import { ItemView, WorkspaceLeaf } from 'obsidian';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { TimelineView } from './TimelineView';
import type { EntityIndexer } from '../data';
import type { Entity } from '../types';

export const TIMELINE_VIEW_TYPE = 'timeline-view';

export class TimelineViewWrapper extends ItemView {
  private indexer: EntityIndexer;
  private reactRoot: ReturnType<typeof createRoot> | null = null;
  private indexUpdateHandler: (() => void) | null = null;
  private pollInterval: number | null = null;
  private lastKnownCount = 0; // Track entity count to detect changes

  constructor(leaf: WorkspaceLeaf, indexer: EntityIndexer) {
    super(leaf);
    this.indexer = indexer;
  }

  getViewType(): string {
    return TIMELINE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Timeline';
  }

  getIcon(): string {
    return 'calendar';
  }

  async onOpen() {
    console.log('[TimelineViewWrapper] onOpen() called!');
    try {
      const container = this.containerEl.children[1];
      if (!container) {
        console.error('[TimelineViewWrapper] No container found!');
        return;
      }

      container.empty();
      container.addClass('timeline-view-container');

      console.log('[TimelineViewWrapper] Creating React root...');
      this.reactRoot = createRoot(container);

      // Listen for custom timeline:index-updated event from FileWatcher (DOM event)
      this.indexUpdateHandler = () => {
        console.log('[TimelineViewWrapper] Received index-updated event');
        this.checkAndRender();
      };

      // Register the event listener BEFORE any potential event dispatch
      document.addEventListener('timeline:index-updated', this.indexUpdateHandler);
      console.log('[TimelineViewWrapper] Event listener registered');

      // Initial check and render
      this.checkAndRender();

      // Also poll periodically to catch any missed updates
      // This provides a fallback mechanism
      this.pollInterval = window.setInterval(() => {
        this.checkAndRender();
      }, 2000); // Check every 2 seconds
      console.log('[TimelineViewWrapper] Polling started');
    } catch (error) {
      console.error('[TimelineViewWrapper] Error in onOpen():', error);
    }
  }

  private checkAndRender() {
    try {
      const currentEntities = this.indexer.getAll();
      const currentCount = currentEntities.length;

      console.log('[TimelineViewWrapper] checkAndRender - entities:', currentCount);

      // Only re-render if count has changed (avoid unnecessary renders)
      if (currentCount !== this.lastKnownCount) {
        console.log('[TimelineViewWrapper] Entity count changed from', this.lastKnownCount, 'to', currentCount);
        this.lastKnownCount = currentCount;
        this.render();
      }
    } catch (error) {
      console.error('[TimelineViewWrapper] Error in checkAndRender():', error);
    }
  }

  private clearPolling() {
    if (this.pollInterval !== null) {
      window.clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  render() {
    if (!this.reactRoot) return;

    const entities = this.indexer.getAll();
    console.log('[TimelineViewWrapper] render() called, entities:', entities.length);

    // Log first few entities for debugging
    if (entities.length > 0) {
      console.log('[TimelineViewWrapper] First entity:', entities[0].name, 'at', entities[0].timeStart);
    }

    this.reactRoot.render(
      React.createElement(TimelineView, {
        entities: entities,
        indexer: this.indexer,
        onOpenNote: this.handleEntityClick,
      })
    );
  }

  async onClose() {
    this.clearPolling();

    if (this.indexUpdateHandler) {
      document.removeEventListener('timeline:index-updated', this.indexUpdateHandler);
      this.indexUpdateHandler = null;
    }
    if (this.reactRoot) {
      this.reactRoot.unmount();
      this.reactRoot = null;
    }
  }

  private handleEntityClick = (entity: Entity) => {
    // Open the corresponding note in a new pane
    this.app.workspace.openLinkText(entity.id, '');
  };
}
