import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Artifact, Project, ProjectDetail, ProjectListItem, RunDetail, RunPublic, RunStatus, StreamEvent, UploadResult } from '../models';
import { ApiService, getToken } from './api.service';

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private api = inject(ApiService);
  private apiUrl = environment.apiUrl;

  createProject(name: string): Observable<Project> {
    return this.api.post<Project>('/projects', { name });
  }

  listProjects(): Observable<ProjectListItem[]> {
    return this.api.get<ProjectListItem[]>('/projects');
  }

  renameProject(id: number, name: string): Observable<Project> {
    return this.api.patch<Project>(`/projects/${id}`, { name });
  }

  deleteProject(id: number): Observable<void> {
    return this.api.delete<void>(`/projects/${id}`);
  }

  getProject(id: number): Observable<ProjectDetail> {
    return this.api.get<ProjectDetail>(`/projects/${id}`);
  }

  uploadZip(projectId: number, file: File): Observable<UploadResult> {
    const form = new FormData();
    form.append('file', file);
    return this.api.postForm<UploadResult>(`/projects/${projectId}/upload`, form);
  }

  analyze(projectId: number): Observable<RunPublic> {
    return this.api.post<RunPublic>(`/runs/${projectId}/analyze`);
  }

  listRuns(): Observable<RunPublic[]> {
    return this.api.get<RunPublic[]>('/runs');
  }

  getRun(id: number): Observable<RunDetail> {
    return this.api.get<RunDetail>(`/runs/${id}`);
  }

  runStatus(id: number, silent = false): Observable<RunStatus> {
    return this.api.get<RunStatus>(`/runs/${id}/status`, silent);
  }

  listArtifacts(runId: number): Observable<Artifact[]> {
    return this.api.get<Artifact[]>(`/artifacts/${runId}`);
  }

  downloadArtifact(artifactId: number): Observable<string> {
    return this.api.getText(`/artifacts/${artifactId}/download`);
  }

  artifactUrl(artifactId: number): string {
    return `${this.apiUrl}/artifacts/${artifactId}/download`;
  }

  streamRun(runId: number): Observable<StreamEvent> {
    return new Observable<StreamEvent>((subscriber) => {
      const controller = new AbortController();
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      fetch(`${this.apiUrl}/runs/${runId}/stream`, { headers, signal: controller.signal })
        .then(async (res) => {
          if (!res.ok || !res.body) {
            subscriber.error(new Error(`SSE HTTP ${res.status}`));
            return;
          }
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let idx = buffer.indexOf('\n\n');
            while (idx !== -1) {
              const chunk = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 2);
              for (const line of chunk.split('\n')) {
                if (line.startsWith('data:')) {
                  try {
                    subscriber.next(JSON.parse(line.slice(5).trim()) as StreamEvent);
                  } catch {
                    /* ignora linha malformada */
                  }
                }
              }
              idx = buffer.indexOf('\n\n');
            }
          }
          subscriber.complete();
        })
        .catch((err: Error) => {
          if (!controller.signal.aborted) {
            subscriber.error(err);
          }
        });
      return () => controller.abort();
    });
  }
}
