import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { forkJoin, switchMap } from 'rxjs';
import { AnalysisService } from '../../../core/services/analysis.service';
import { AppState } from '../../../core/state';
import type { Artifact, ProjectDetail } from '../../../core/models';
import { UploadComponent } from '../upload/upload.component';
import { MermaidViewerComponent } from '../../viewers/mermaid-viewer/mermaid-viewer.component';
import { SqlViewerComponent } from '../../viewers/sql-viewer/sql-viewer.component';
import { AiReportComponent } from '../../viewers/ai-report/ai-report.component';

type Tab = 'mer' | 'sql' | 'explain';

/** Vocabulário do backend para run encerrada (orchestrator.py grava status=stage). */
const TERMINAIS = ['done', 'failed'];

@Component({
  selector: 'app-result',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    UploadComponent,
    MermaidViewerComponent,
    SqlViewerComponent,
    AiReportComponent,
  ],
  templateUrl: './result.component.html',
  styleUrl: './result.component.css',
})
export class ResultComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private analysis = inject(AnalysisService);
  private state = inject(AppState);

  project = signal<ProjectDetail | null>(null);
  error = signal('');
  analyzing = signal(false);
  activeTab = signal<Tab>('mer');
  erdSrc = signal('');
  sqlSrc = signal('');
  explanation = signal('');
  loadingResult = signal(false);
  runError = signal('');

  ngOnInit(): void {
    this.route.params
      .pipe(switchMap((params) => this.analysis.getProject(Number(params['id']))))
      .subscribe({
        next: (p) => {
          this.project.set(p);
          if (p.runs.length === 0) return;
          const latest = [...p.runs].sort((a, b) => b.id - a.id)[0];
          // Sair da tela de progresso nunca interrompeu a análise -- ela roda no
          // servidor e o navegador só acompanha. O que faltava era o caminho de
          // volta: abrir o projeto com uma run em andamento devolve a tela de
          // progresso no ponto exato, em vez de cair no upload ou num resultado
          // que ainda não existe. `replaceUrl` evita o vaivém no botão voltar.
          if (!TERMINAIS.includes(latest.status)) {
            this.router.navigate(['/app/projects', p.id, 'analysis', latest.id], { replaceUrl: true });
            return;
          }
          this.loadRun(latest.id);
        },
        error: () => this.error.set('Projeto não encontrado.'),
      });
  }

  analyze(): void {
    const pid = this.project()?.id;
    if (!pid || this.analyzing()) return;
    this.analyzing.set(true);
    this.error.set('');
    this.analysis.analyze(pid).subscribe({
      next: (run) => {
        this.analyzing.set(false);
        this.state.info(`Análise #${run.id} iniciada.`);
        this.router.navigate(['/app/projects', pid, 'analysis', run.id]);
      },
      error: () => {
        this.analyzing.set(false);
        this.error.set('Falha ao iniciar a análise.');
      },
    });
  }

  onUploaded(): void {
    const pid = this.project()?.id;
    if (!pid) return;
    this.analysis.getProject(pid).subscribe({
      next: (p) => this.project.set(p),
      error: () => this.error.set('Falha ao atualizar o projeto.'),
    });
  }

  hasSuccessfulRun(p: ProjectDetail): boolean {
    return p.runs.some((r) => r.status === 'done');
  }

  private loadRun(runId: number): void {
    this.loadingResult.set(true);
    this.analysis.getRun(runId).subscribe({
      next: (run) => {
        if (run.status === 'failed') {
          this.runError.set(run.error_message ?? 'Falha na análise.');
          this.loadingResult.set(false);
          return;
        }
        this.runError.set('');
        this.fetchArtifacts(run.artifacts);
      },
      error: () => {
        this.loadingResult.set(false);
        this.error.set('Falha ao carregar o resultado.');
      },
    });
  }

  private fetchArtifacts(artifacts: Artifact[]): void {
    const byName = new Map(artifacts.map((a) => [a.filename, a.id]));
    const targets: { name: string; obs: ReturnType<AnalysisService['downloadArtifact']> }[] = [];
    for (const name of ['schema.mmd', 'schema.sql', 'report.md', 'model.json']) {
      const id = byName.get(name);
      if (id) {
        targets.push({ name, obs: this.analysis.downloadArtifact(id) });
      }
    }
    if (targets.length === 0) {
      this.loadingResult.set(false);
      return;
    }
    forkJoin(targets.map((t) => t.obs)).subscribe({
      next: (contents) => {
        let parecer = '';
        let notas = '';
        targets.forEach((t, i) => {
          const content = contents[i];
          if (t.name === 'schema.mmd') {
            this.erdSrc.set(content);
          } else if (t.name === 'schema.sql') {
            this.sqlSrc.set(content);
          } else if (t.name === 'report.md') {
            parecer = content;
          } else {
            try {
              const data = JSON.parse(content) as { notes?: string[] };
              notas = (data.notes ?? []).join('\n\n');
            } catch {
              notas = '';
            }
          }
        });
        // O parecer já traz as notas do modelo dentro dele, na seção "Raciocínio
        // da modelagem" (report_generator._bloco_de_raciocinio). O model.json só
        // entra quando a run é anterior ao report.md e ele não existe.
        this.explanation.set(parecer || notas);
        this.loadingResult.set(false);
      },
      error: () => {
        this.loadingResult.set(false);
        this.error.set('Falha ao carregar os artefatos.');
      },
    });
  }
}
