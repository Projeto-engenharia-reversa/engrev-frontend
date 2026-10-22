import { Component, effect, ElementRef, input, signal, viewChild } from '@angular/core';
import type mermaid from 'mermaid';

@Component({
  selector: 'app-mermaid-viewer',
  standalone: true,
  templateUrl: './mermaid-viewer.component.html',
  styleUrl: './mermaid-viewer.component.css',
})
export class MermaidViewerComponent {
  src = input.required<string>();
  error = signal('');
  private container = viewChild<ElementRef<HTMLDivElement>>('container');
  private lib: typeof mermaid | null = null;

  constructor() {
    effect(() => {
      const source = this.src();
      if (source) {
        void this.render(source);
      }
    });
  }

  private async render(source: string): Promise<void> {
    const host = this.container()?.nativeElement;
    if (!host) return;
    this.error.set('');
    try {
      if (!this.lib) {
        this.lib = (await import('mermaid')).default;
        this.lib.initialize({ startOnLoad: false, theme: 'dark', fontSize: 16 });
      }
      host.innerHTML = '';
      const id = `mmd-${Math.random().toString(36).slice(2, 9)}`;
      const { svg } = await this.lib.render(id, source);
      host.innerHTML = svg;
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Falha ao renderizar diagrama.');
    }
  }
}
