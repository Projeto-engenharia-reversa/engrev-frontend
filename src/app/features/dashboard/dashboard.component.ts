import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProjectStore } from '../../core/services/project.store';
import type { ProjectListItem } from '../../core/models';

/** Como cada estado de análise se lê na tela.
 *
 * `Project.status` não serve aqui: ele vale "created" ou "ready" e fala do
 * upload. A pergunta que esta tela responde — "já passou por uma análise?" —
 * só a última run responde.
 */
type Situacao = { rotulo: string; tom: 'neutro' | 'ok' | 'andando' | 'falhou' };

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private store = inject(ProjectStore);
  private auth = inject(AuthService);

  projects = this.store.projects;
  loaded = this.store.loaded;
  creating = signal(false);

  analisados = computed(() => this.projects().filter((p) => p.last_run_status === 'done').length);

  ngOnInit(): void {
    // A sidebar já carrega, mas ela pode estar recolhida ou a tela pode ter sido
    // aberta direto pela URL. Recarregar aqui também mantém a data de atividade
    // fresca ao voltar de uma análise.
    this.store.refresh();
  }

  get displayName(): string {
    const u = this.auth.user();
    return u?.name ?? u?.email ?? '';
  }

  get initial(): string {
    return (this.displayName || '?')[0].toUpperCase();
  }

  situacao(p: ProjectListItem): Situacao {
    if (p.runs_count === 0) return { rotulo: 'Sem análise', tom: 'neutro' };
    if (p.last_run_status === 'done') return { rotulo: 'Analisado', tom: 'ok' };
    if (p.last_run_status === 'failed') return { rotulo: 'Falhou', tom: 'falhou' };
    return { rotulo: 'Em andamento', tom: 'andando' };
  }

  /** "há 3 dias" comunica melhor que uma data absoluta numa lista de retomada:
   * a pergunta é "quanto tempo faz", não "que dia foi". */
  quandoFoi(iso: string): string {
    const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutos < 1) return 'agora há pouco';
    if (minutos < 60) return `há ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `há ${horas} h`;
    const dias = Math.floor(horas / 24);
    if (dias === 1) return 'ontem';
    if (dias < 30) return `há ${dias} dias`;
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  createProject(): void {
    if (this.creating()) return;
    this.creating.set(true);
    this.store.create().subscribe({
      next: () => this.creating.set(false),
      error: () => this.creating.set(false),
    });
  }
}
