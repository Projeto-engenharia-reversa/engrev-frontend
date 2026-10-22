import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnalysisService } from '../../../core/services/analysis.service';
import type { StreamEvent } from '../../../core/models';

/**
 * Rótulo e frase de cada estágio que o orchestrator grava.
 *
 * O backend usa um vocabulário só para `status` e `stage` e manda os dois crus
 * ("scan", "modeling"). Traduzir aqui resolve duas coisas de uma vez: a barra
 * deixa de exibir identificador técnico, e o evento `snapshot` -- que vem sem
 * `message` -- volta a ter uma frase de status depois de um F5, em vez de cair
 * no genérico "Iniciando análise…" com a barra já em 72%.
 */
const ESTAGIOS: Record<string, { rotulo: string; mensagem: string }> = {
  pending: { rotulo: 'Na fila', mensagem: 'Preparando a análise…' },
  scan: { rotulo: 'Varredura', mensagem: 'Escaneando arquivos…' },
  parse: { rotulo: 'Leitura', mensagem: 'Extraindo resumos…' },
  structural: { rotulo: 'Estrutura', mensagem: 'Construindo modelo estrutural…' },
  modeling: { rotulo: 'Modelagem com IA', mensagem: 'Modelando com IA…' },
  validation: { rotulo: 'Validação', mensagem: 'Validando modelo…' },
  artifacts: { rotulo: 'Artefatos', mensagem: 'Gerando artefatos…' },
  done: { rotulo: 'Concluído', mensagem: 'Análise concluída' },
  failed: { rotulo: 'Falhou', mensagem: 'A análise falhou' },
};

const POLL_MS = 3000;

/** Acima disto o `created_at` da run não serve como zero do cronômetro: o
 *  backend pode devolver o timestamp sem fuso e o navegador lê como hora local.
 *  Nesse caso conta-se da abertura da tela, que erra menos. */
const DERIVA_MAXIMA_S = 6 * 3600;

@Component({
  selector: 'app-analysis-screen',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  templateUrl: './analysis-screen.component.html',
  styleUrl: './analysis-screen.component.css',
})
export class AnalysisScreenComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private analysis = inject(AnalysisService);

  projectId = signal(0);
  projectName = signal('');
  runId = signal(0);
  stage = signal('pending');
  progress = signal(0);
  status = signal('pending');
  message = signal('');
  error = signal('');
  reconectando = signal(false);
  decorrido = signal(0);

  concluido = computed(() => this.status() === 'done');
  falhou = computed(() => this.status() === 'failed');
  emAndamento = computed(() => !this.concluido() && !this.falhou());
  modelando = computed(() => this.stage() === 'modeling');

  stageLabel = computed(() => ESTAGIOS[this.stage()]?.rotulo ?? this.stage());
  statusMessage = computed(
    () => this.message() || ESTAGIOS[this.stage()]?.mensagem || 'Iniciando análise…',
  );
  tempo = computed(() => {
    const s = this.decorrido();
    const m = Math.floor(s / 60);
    return m > 0 ? m + 'm' + String(s % 60).padStart(2, '0') + 's' : s + 's';
  });

  private paramsSub: Subscription | null = null;
  private streamSub: Subscription | null = null;
  private pollSub: Subscription | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private inicio = Date.now();

  ngOnInit(): void {
    // `route.params`, não `route.snapshot`: o router reusa esta instância quando
    // só os parâmetros mudam, então ir de uma análise direto para outra não
    // passaria por ngOnInit e a tela seguiria acompanhando a run antiga. Mesmo
    // padrão que result.component.ts já usa.
    this.paramsSub = this.route.params.subscribe((p) => {
      this.observarRun(Number(p['id']), Number(p['runId']));
    });
    this.tickTimer = setInterval(() => {
      if (this.emAndamento()) {
        this.decorrido.set(Math.floor((Date.now() - this.inicio) / 1000));
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    this.paramsSub?.unsubscribe();
    this.pararStream();
    this.pararPolling();
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  openResult(): void {
    this.router.navigate(['/app/projects', this.projectId()]);
  }

  private observarRun(projectId: number, runId: number): void {
    this.pararStream();
    this.pararPolling();

    this.projectId.set(projectId);
    this.runId.set(runId);
    this.projectName.set('');
    this.stage.set('pending');
    this.progress.set(0);
    this.status.set('pending');
    this.message.set('');
    this.error.set('');
    this.reconectando.set(false);
    this.inicio = Date.now();
    this.decorrido.set(0);

    // Uma requisição resolve duas coisas: o nome do projeto no título e o
    // instante em que a run nasceu, que é o zero honesto do cronômetro e
    // sobrevive a um F5 (contar da abertura da tela reiniciaria o relógio).
    this.analysis.getProject(projectId).subscribe({
      next: (p) => {
        this.projectName.set(p.name);
        const run = p.runs.find((r) => r.id === runId);
        if (!run) return;
        const nascimento = new Date(run.created_at).getTime();
        const segundos = Math.floor((Date.now() - nascimento) / 1000);
        if (segundos >= 0 && segundos < DERIVA_MAXIMA_S) {
          this.inicio = nascimento;
          this.decorrido.set(segundos);
        }
      },
    });

    this.streamSub = this.analysis.streamRun(runId).subscribe({
      next: (e) => this.aplicar(e),
      error: () => this.cairParaPolling(),
      complete: () => {
        // O stream fecha sozinho ao fim da run. Se fechou sem estado terminal,
        // algo cortou a conexão no meio (proxy, sleep da máquina, restart do
        // backend). Antes `complete` não era tratado e a tela congelava no
        // último progresso recebido, para sempre.
        if (this.emAndamento()) {
          this.cairParaPolling();
        }
      },
    });
  }

  private aplicar(e: StreamEvent): void {
    if (e.stage) this.stage.set(e.stage);
    if (e.progress !== undefined) this.progress.set(e.progress);
    if (e.message) this.message.set(e.message);

    // `type` e `status` falam vocabulários diferentes: ao vivo chega
    // type="finished", e no snapshot depois de um F5 chega status="done".
    // Aceitar só um dos dois era o que fazia a análise terminar sem o botão
    // "Ver resultado" nunca aparecer.
    if (e.type === 'finished') {
      this.status.set('done');
      this.progress.set(1);
    } else if (e.type === 'failed') {
      this.status.set('failed');
    } else if (e.status) {
      this.status.set(e.status);
    }

    if (this.falhou()) {
      this.error.set(e.message || this.error() || 'Falha na análise.');
    }
    if (!this.emAndamento()) {
      this.reconectando.set(false);
      this.pararPolling();
    }
  }

  /** Rede de segurança para quando o stream morre com a run ainda rodando.
   *  `runStatus` já existia no serviço e nunca havia sido chamado por ninguém. */
  private cairParaPolling(): void {
    if (!this.emAndamento() || this.pollTimer !== null) return;
    this.pararStream();
    this.reconectando.set(true);
    const consultar = () => {
      this.pollSub?.unsubscribe();
      this.pollSub = this.analysis.runStatus(this.runId(), true).subscribe({
        next: (s) =>
          this.aplicar({
            type: 'snapshot',
            run_id: s.id,
            status: s.status,
            stage: s.stage,
            progress: s.progress,
            message: s.error_message ?? undefined,
          }),
        error: () => {
          /* rede instável: a próxima consulta tenta de novo */
        },
      });
    };
    consultar();
    this.pollTimer = setInterval(consultar, POLL_MS);
  }

  private pararStream(): void {
    this.streamSub?.unsubscribe();
    this.streamSub = null;
  }

  private pararPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }
}
