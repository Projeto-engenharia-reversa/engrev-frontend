import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import type { Project, ProjectListItem } from '../models';
import { AnalysisService } from './analysis.service';

@Injectable({ providedIn: 'root' })
export class ProjectStore {
  private analysis = inject(AnalysisService);
  private router = inject(Router);

  readonly projects = signal<ProjectListItem[]>([]);
  readonly loaded = signal(false);

  refresh(): void {
    this.analysis.listProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loaded.set(true);
      },
    });
  }

  create(): Observable<Project> {
    const base = 'Novo projeto';
    const taken = new Set(this.projects().map((p) => p.name));
    let name = base;
    let n = 2;
    while (taken.has(name)) {
      name = `${base} ${n++}`;
    }
    return this.analysis.createProject(name).pipe(
      tap((p) => {
        // O POST devolve `Project`, sem o resumo de análises que só a listagem
        // monta. Completar aqui com o que é verdade para um projeto recém-criado
        // evita um GET extra só para descobrir que ele tem zero runs.
        this.projects.update((list) => [{ ...p, runs_count: 0, last_run_status: null, last_activity_at: p.updated_at }, ...list]);
        this.router.navigate(['/app/projects', p.id]);
      }),
    );
  }

  rename(id: number, name: string): Observable<Project> {
    return this.analysis.renameProject(id, name).pipe(
      tap((p) => {
        // Só o que o PATCH de fato mudou: preservar o resumo de análises que já
        // estava na lista, em vez de sobrescrever o item inteiro e zerá-lo.
        this.projects.update((list) => list.map((x) => (x.id === p.id ? { ...x, ...p } : x)));
      }),
    );
  }

  remove(id: number): Observable<void> {
    return this.analysis.deleteProject(id).pipe(
      tap(() => {
        this.projects.update((list) => list.filter((x) => x.id !== id));
      }),
    );
  }
}
