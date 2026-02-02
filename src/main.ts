import { Plugin, PluginSettingTab, App, Setting, TFile, WorkspaceLeaf, FuzzySuggestModal } from 'obsidian';
import { EntityIndexer } from './data/indexer';
import { FrontmatterParser } from './data/parser';
import { FileWatcher } from './data/watcher';
import { TimelineViewWrapper, TIMELINE_VIEW_TYPE } from './ui/TimelineViewWrapper';
import './styles.css';

interface TimelineSettings {
  dataSources: string[];
}

const DEFAULT_SETTINGS: TimelineSettings = {
  dataSources: [],
};

export default class TimelinePlugin extends Plugin {
  settings: TimelineSettings = DEFAULT_SETTINGS;
  indexer!: EntityIndexer;
  parser!: FrontmatterParser;
  watcher!: FileWatcher;

  async onload() {
    console.log('[Timeline Plugin] onload() started');
    await this.loadSettings();

    // Load plugin CSS
    this.loadStyles();

    // Initialize data layer
    this.indexer = new EntityIndexer();
    this.parser = new FrontmatterParser();
    this.watcher = new FileWatcher(this.app, this.indexer, this.parser);
    this.watcher.updateDataSources(this.settings.dataSources);
    this.watcher.register();
    console.log('[Timeline Plugin] Data watcher registered');

    // Register the timeline view
    this.registerView(TIMELINE_VIEW_TYPE, (leaf) => {
      console.log('[Timeline Plugin] Creating TimelineViewWrapper for leaf');
      return new TimelineViewWrapper(leaf, this.indexer);
    });
    console.log('[Timeline Plugin] View type registered:', TIMELINE_VIEW_TYPE);

    // This creates an icon in the left ribbon.
    this.addRibbonIcon('calendar', 'Open Timeline', () => {
      console.log('[Timeline Plugin] Ribbon icon clicked');
      this.activateTimelineView();
    });

    // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
    this.addStatusBarItem().setText('Timeline loaded');

    // This adds a simple command that can be triggered anywhere
    this.addCommand({
      id: 'show-timeline',
      name: 'Show Timeline',
      callback: () => {
        console.log('[Timeline Plugin] Show timeline command triggered');
        this.activateTimelineView();
      },
    });

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new TimelineSettingTab(this.app, this));
    console.log('[Timeline Plugin] onload() completed');
  }

  onunload() {
    this.watcher?.unregister();
    console.log('Timeline plugin unloaded');
  }

  private activateTimelineView() {
    console.log('[Timeline Plugin] activateTimelineView() called');
    const { workspace } = this.app;

    // First, check if timeline view already exists in any leaf
    const existingLeaves = workspace.getLeavesOfType(TIMELINE_VIEW_TYPE);
    console.log('[Timeline Plugin] Existing timeline leaves:', existingLeaves.length);

    if (existingLeaves.length > 0) {
      // Timeline view already exists, just activate it
      console.log('[Timeline Plugin] Revealing existing timeline view');
      workspace.revealLeaf(existingLeaves[0]);
      return;
    }

    // Timeline view doesn't exist, create it in the right sidebar
    // getRightLeaf(false) tries to reuse existing sidebar, returns null if none exists
    let leaf = workspace.getRightLeaf(false);
    console.log('[Timeline Plugin] getRightLeaf(false) returned:', leaf ? 'found' : 'null');

    if (!leaf) {
      // No right sidebar exists, create a new one
      // getRightLeaf() with true (or no arg) creates a new leaf in right sidebar
      console.log('[Timeline Plugin] Creating new right sidebar leaf');
      leaf = workspace.getRightLeaf(true);
    }

    if (leaf) {
      console.log('[Timeline Plugin] Setting view state to timeline view');
      leaf.setViewState({ type: TIMELINE_VIEW_TYPE, active: true });
      workspace.revealLeaf(leaf);
      console.log('[Timeline Plugin] Timeline view activated');
    } else {
      console.error('[Timeline Plugin] Failed to create leaf for timeline view!');
    }
  }

  private async loadStyles() {
    // Load the CSS file
    try {
      const cssContent = await this.app.vault.adapter.read(
        this.app.vault.configDir + '/plugins/obsidian-timeline/style.css'
      );
      // Inject CSS into the document
      const styleEl = document.createElement('style');
      styleEl.textContent = cssContent;
      document.head.appendChild(styleEl);
    } catch (e) {
      console.warn('Could not load timeline styles:', e);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class TimelineSettingTab extends PluginSettingTab {
  plugin: TimelinePlugin;

  constructor(app: App, plugin: TimelinePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this as unknown as { containerEl: HTMLElement };

    containerEl.empty();

    containerEl.createEl('h2', { text: 'Timeline Settings' });

    // Data sources section
    containerEl.createEl('h3', { text: 'Data Sources' });
    containerEl.createEl('p', {
      text: 'Select folders to scan for timeline entities. Files in these folders will be indexed based on their YAML frontmatter.',
    });

    // Show current data sources
    if (this.plugin.settings.dataSources.length > 0) {
      const listEl = containerEl.createEl('ul', { cls: 'setting-list' });
      this.plugin.settings.dataSources.forEach((folder) => {
        const itemEl = listEl.createEl('li', { cls: 'setting-item' });
        itemEl.createEl('span', { text: folder });
        const removeBtn = itemEl.createEl('button', {
          text: 'Remove',
          cls: 'mod-warning',
        });
        removeBtn.onclick = async () => {
          this.plugin.settings.dataSources = this.plugin.settings.dataSources.filter(
            (f) => f !== folder
          );
          this.plugin.watcher.updateDataSources(this.plugin.settings.dataSources);
          await this.plugin.saveSettings();
          this.display();
        };
      });
    }

    // Add folder button
    new Setting(containerEl)
      .setName('Add folder')
      .setDesc('Add a folder to scan for timeline entities')
      .addButton((button) => {
        button.setButtonText('Add folder');
        button.onClick(async () => {
          const folders = this.app.vault.getAllLoadedFiles();
          const folderPaths = folders
            .filter((f) => 'children' in f) // Only folders
            .map((f) => f.path)
            .sort();

          // Simple prompt to select folder (in a real app, use a modal)
          const folder = await this.promptForFolder(folderPaths);
          if (folder && !this.plugin.settings.dataSources.includes(folder)) {
            this.plugin.settings.dataSources.push(folder);
            this.plugin.watcher.updateDataSources(this.plugin.settings.dataSources);
            await this.plugin.saveSettings();
            this.display();
          }
        });
        return button;
      });

    // Statistics section
    const stats = this.plugin.indexer.getStats();
    containerEl.createEl('h3', { text: 'Statistics' });
    new Setting(containerEl)
      .setName('Total entities')
      .setDesc(`${stats.total} entities indexed`);
    new Setting(containerEl)
      .setName('By type')
      .setDesc(
        Object.entries(stats.byType)
          .map(([type, count]) => `${type}: ${count}`)
          .join(', ') || 'No entities'
      );
  }

  private async promptForFolder(folderPaths: string[]): Promise<string | null> {
    return new Promise((resolve) => {
      new FolderSelectModal(this.app, folderPaths, (result) => {
        resolve(result);
      }).open();
    });
  }
}

// Modal for selecting a folder
class FolderSelectModal extends FuzzySuggestModal<string> {
  private folders: string[];
  private onSelect: (folder: string | null) => void;
  private itemSelected = false;

  constructor(app: App, folders: string[], onSelect: (folder: string | null) => void) {
    super(app);
    this.folders = folders;
    this.onSelect = onSelect;
  }

  getItems(): string[] {
    return this.folders;
  }

  getItemText(item: string): string {
    return item;
  }

  onChooseItem(item: string, evt: MouseEvent | KeyboardEvent): void {
    this.itemSelected = true;
    this.onSelect(item);
  }

  onClose(): void {
    // If closed without selection, return null
    if (!this.itemSelected) {
      this.onSelect(null);
    }
  }
}
