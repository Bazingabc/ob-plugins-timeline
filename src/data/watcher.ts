import { App, TFile, EventRef } from 'obsidian';
import { EntityIndexer } from './indexer';
import { FrontmatterParser } from './parser';

export class FileWatcher {
  private app: App;
  private indexer: EntityIndexer;
  private parser: FrontmatterParser;
  private dataSources: string[] = [];
  private registered = false;
  private metadataEventRef: EventRef | null = null;
  private vaultEventRefs: EventRef[] = [];

  constructor(app: App, indexer: EntityIndexer, parser: FrontmatterParser) {
    this.app = app;
    this.indexer = indexer;
    this.parser = parser;
  }

  /**
   * Register file change listeners
   */
  register(): void {
    if (this.registered) {
      return;
    }

    // Listen for metadata changes (frontmatter edits)
    this.metadataEventRef = this.app.metadataCache.on(
      'changed',
      (file: TFile) => this.handleFileChange(file)
    );

    // Listen for file deletions
    const vault = this.app.vault;
    const deleteEvent = vault.on('delete', (file) => {
      if (file instanceof TFile) {
        this.handleFileDelete(file.path);
      }
    });
    this.vaultEventRefs.push(deleteEvent);

    // Listen for file renames
    const renameEvent = vault.on('rename', (file, oldPath) => {
      if (file instanceof TFile) {
        this.handleFileRename(oldPath, file.path);
      }
    });
    this.vaultEventRefs.push(renameEvent);

    this.registered = true;

    // Delay initial index build to ensure MetadataCache is ready
    // Use setTimeout to allow Obsidian to finish loading metadata
    setTimeout(() => {
      this.rebuildIndex();
    }, 1000);
  }

  /**
   * Unregister all listeners
   */
  unregister(): void {
    // Unregister metadata cache event
    if (this.metadataEventRef) {
      this.app.metadataCache.offref(this.metadataEventRef);
      this.metadataEventRef = null;
    }

    // Unregister vault events
    for (const eventRef of this.vaultEventRefs) {
      this.app.vault.offref(eventRef);
    }
    this.vaultEventRefs = [];

    this.registered = false;
  }

  /**
   * Update data sources folders
   */
  updateDataSources(folders: string[]): void {
    this.dataSources = folders;
    // Only rebuild immediately if already registered (MetadataCache is ready)
    // Otherwise, wait for register() to trigger the rebuild
    if (this.registered) {
      this.rebuildIndex();
    }
  }

  /**
   * Handle file metadata change
   */
  private handleFileChange(file: TFile): void {
    if (!this.isInDataSources(file.path)) {
      return;
    }

    try {
      const entity = this.parser.parseEntity(file, this.app.metadataCache);
      if (entity) {
        this.indexer.upsert({
          id: entity.id,
          type: entity.type,
          name: entity.name,
          timeStart: entity.timeStart,
          timeEnd: entity.timeEnd,
          tags: entity.tags,
          participants: entity.participants,
          importance: entity.importance,
          location: entity.location,
        });
        console.log(`[Timeline] Updated entity: ${entity.name}`);
      } else {
        // If parsing fails, remove from index
        this.indexer.remove(file.path);
      }
    } catch (error) {
      console.error(`[Timeline] Error processing file ${file.path}:`, error);
    }
  }

  /**
   * Handle file deletion
   */
  private handleFileDelete(path: string): void {
    if (!this.isInDataSources(path)) {
      return;
    }
    this.indexer.remove(path);
    console.log(`[Timeline] Removed entity: ${path}`);
  }

  /**
   * Handle file rename
   */
  private handleFileRename(oldPath: string, newPath: string): void {
    if (!this.isInDataSources(oldPath) && !this.isInDataSources(newPath)) {
      return;
    }

    // Remove old path, new path will be picked up by metadata:changed
    this.indexer.remove(oldPath);

    // Trigger re-index of new path
    const file = this.app.vault.getAbstractFileByPath(newPath);
    if (file instanceof TFile) {
      this.handleFileChange(file);
    }
  }

  /**
   * Check if a file path is within any data source folder
   */
  private isInDataSources(path: string): boolean {
    if (this.dataSources.length === 0) {
      return true; // If no data sources specified, scan all files
    }
    return this.dataSources.some((folder) => path.startsWith(folder));
  }

  /**
   * Rebuild the entire index from scratch
   */
  async rebuildIndex(): Promise<void> {
    console.log('[Timeline] Rebuilding index...');
    this.indexer.clear();

    const files = this.app.vault.getMarkdownFiles();

    for (const file of files) {
      if (this.isInDataSources(file.path)) {
        try {
          const entity = this.parser.parseEntity(file, this.app.metadataCache);
          if (entity) {
            this.indexer.upsert({
              id: entity.id,
              type: entity.type,
              name: entity.name,
              timeStart: entity.timeStart,
              timeEnd: entity.timeEnd,
              tags: entity.tags,
              participants: entity.participants,
              importance: entity.importance,
              location: entity.location,
            });
          }
        } catch (error) {
          console.error(`[Timeline] Error parsing file ${file.path}:`, error);
        }
      }
    }

    const stats = this.indexer.getStats();
    console.log(`[Timeline] Index rebuilt: ${stats.total} entities`);

    // Trigger custom DOM event to notify views
    document.dispatchEvent(new CustomEvent('timeline:index-updated'));
  }

  /**
   * Get current data sources
   */
  getDataSources(): string[] {
    return [...this.dataSources];
  }
}
