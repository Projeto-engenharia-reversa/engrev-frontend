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
  /** Base do nome do arquivo baixado. Quem usa o viewer passa o nome do projeto. */
  nomeBase = input('diagrama-er');
  error = signal('');
  /** Só libera o download depois que existe SVG na tela para serializar. */
  pronto = signal(false);
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

  /** Baixa como `.svg` o diagrama que já está na tela.
   *
   * Serializa o SVG que o mermaid renderizou em vez de gerar outro desenho: o
   * arquivo é exatamente o que o usuário está vendo, sem risco de divergir.
   */
  baixarSvg(): void {
    const svg = this.container()?.nativeElement.querySelector('svg');
    if (!svg) return;

    const clone = svg.cloneNode(true) as SVGSVGElement;
    // O mermaid devolve `width="100%"` e um `max-width` no style. Isso funciona
    // dentro da página e vira tamanho zero num arquivo aberto sozinho, porque
    // fora de um elemento pai não há 100% de nada. As medidas reais estão no
    // viewBox.
    const viewBox = (svg.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
    if (viewBox.length === 4 && viewBox[2] > 0 && viewBox[3] > 0) {
      clone.setAttribute('width', String(viewBox[2]));
      clone.setAttribute('height', String(viewBox[3]));
    }
    // Só o max-width sai; o resto do style carrega a cor de fundo do tema.
    clone.style.maxWidth = 'none';
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const blob = new Blob([new XMLSerializer().serializeToString(clone)], {
      type: 'image/svg+xml;charset=utf-8',
    });
    this.baixar(blob, `${this.nomeDoArquivo()}.svg`);
  }

  /** Nome de projeto vira nome de arquivo sem caractere que o sistema recuse. */
  private nomeDoArquivo(): string {
    const limpo = this.nomeBase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return limpo || 'diagrama-er';
  }

  private baixar(blob: Blob, nome: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Revogar na mesma hora cancela o download em alguns navegadores.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private async render(source: string): Promise<void> {
    const host = this.container()?.nativeElement;
    if (!host) return;
    this.error.set('');
    this.pronto.set(false);
    try {
      if (!this.lib) {
        this.lib = (await import('mermaid')).default;
        this.lib.initialize({ startOnLoad: false, theme: 'dark', fontSize: 16 });
      }
      host.innerHTML = '';
      const id = `mmd-${Math.random().toString(36).slice(2, 9)}`;
      const { svg } = await this.lib.render(id, source);
      host.innerHTML = svg;
      this.pronto.set(true);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Falha ao renderizar diagrama.');
    }
  }
}
