import { Component, computed, input } from '@angular/core';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Marcação de linha do parecer.
 *
 * Os trechos entre crases saem de cena antes de negrito e itálico: sem isso um
 * par como `user_id` ... `post_id` casa com a regra do sublinhado e o texto
 * entre as duas colunas vira itálico.
 */
function inline(s: string): string {
  // O texto chega escapado, então não sobrou nenhum '<' solto nele: um marcador
  // como `<0>` não colide com o conteúdo, e as tags criadas logo abaixo não
  // colidem com o marcador, porque dentro dele só há dígitos.
  const codigos: string[] = [];
  let out = s.replace(/`([^`]+)`/g, (_m, c: string) => `<${codigos.push(c) - 1}>`);
  out = out
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w])_([^_]+)_(?!\w)/g, '$1<em>$2</em>');
  return out.replace(/<(\d+)>/g, (_m, i: string) => `<code>${codigos[Number(i)]}</code>`);
}

/** Converte o parecer em HTML.
 *
 * O Markdown vem do gerador do backend (`prompts/report.md`), então o
 * subconjunto é fixo e pequeno: dois níveis de título, listas, negrito,
 * itálico e código. Renderizar aqui evita trazer uma biblioteca só para isso.
 * Tudo é escapado antes de qualquer marcação, porque nomes de tabela e notas
 * do modelo vêm do código analisado e não são conteúdo confiável.
 */
function toHtml(md: string): string {
  if (!md) return '';

  // O gerador quebra a entidade em duas linhas: o cabeçalho no item da lista e
  // as colunas indentadas logo abaixo. Juntar as duas antes de montar a lista
  // evita fechar o <li> no meio do item.
  const linhas: string[] = [];
  for (const bruta of escapeHtml(md).split('\n')) {
    const anterior = linhas[linhas.length - 1];
    if (/^\s{2,}\S/.test(bruta) && anterior !== undefined && /^-\s/.test(anterior)) {
      linhas[linhas.length - 1] = `${anterior}\n${bruta.trim()}`;
    } else {
      linhas.push(bruta);
    }
  }

  const out: string[] = [];
  let lista = false;
  const fechaLista = (): void => {
    if (lista) {
      out.push('</ul>');
      lista = false;
    }
  };

  for (const linha of linhas) {
    const h2 = /^##\s+(.*)$/.exec(linha);
    const h1 = /^#\s+(.*)$/.exec(linha);
    const item = /^-\s+([\s\S]*)$/.exec(linha);

    if (h2) {
      fechaLista();
      out.push(`<h4>${inline(h2[1])}</h4>`);
    } else if (h1) {
      fechaLista();
      out.push(`<h3>${inline(h1[1])}</h3>`);
    } else if (item) {
      if (!lista) {
        out.push('<ul>');
        lista = true;
      }
      const [cabecalho, ...resto] = item[1].split('\n');
      const colunas = resto.length ? `<span class="cols">${inline(resto.join(' '))}</span>` : '';
      out.push(`<li>${inline(cabecalho)}${colunas}</li>`);
    } else if (!linha.trim()) {
      fechaLista();
    } else {
      fechaLista();
      out.push(`<p>${inline(linha)}</p>`);
    }
  }
  fechaLista();
  return out.join('\n');
}

@Component({
  selector: 'app-ai-report',
  standalone: true,
  templateUrl: './ai-report.component.html',
  styleUrl: './ai-report.component.css',
})
export class AiReportComponent {
  report = input.required<string>();

  html = computed(() => toHtml(this.report()));

  /** Copia o Markdown, não o texto renderizado: é o formato do artefato. */
  copy(): void {
    void navigator.clipboard.writeText(this.report());
  }
}
