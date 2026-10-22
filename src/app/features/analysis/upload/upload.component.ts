import { Component, computed, inject, input, output, signal } from '@angular/core';
import { AnalysisService } from '../../../core/services/analysis.service';
import type { FileItem, UploadResult } from '../../../core/models';
import { AppState } from '../../../core/state';
import { SpinnerComponent } from '../../shared/spinner/spinner.component';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [SpinnerComponent],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.css',
})
export class UploadComponent {
  private analysis = inject(AnalysisService);
  private state = inject(AppState);

  projectId = input.required<number>();
  uploaded = output<UploadResult>();
  uploading = signal(false);
  result = signal<UploadResult | null>(null);
  dragOver = signal(false);
  acceptedOpen = signal(true);
  rejectedOpen = signal(false);
  acceptedItems = computed(() => (this.result()?.items ?? []).filter((i) => i.status === 'ok'));
  rejectedItems = computed(() => (this.result()?.items ?? []).filter((i) => i.status !== 'ok'));

  toggleAccepted(): void {
    this.acceptedOpen.update((v) => !v);
  }

  toggleRejected(): void {
    this.rejectedOpen.update((v) => !v);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.upload(file);
    }
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.upload(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
  }

  fileName(item: FileItem): string {
    return item.path.split('/').pop() ?? item.path;
  }

  fileDir(item: FileItem): string {
    const parts = item.path.split('/');
    parts.pop();
    return parts.join('/');
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  private upload(file: File): void {
    if (this.uploading()) return;
    this.result.set(null);
    this.uploading.set(true);
    this.analysis.uploadZip(this.projectId(), file).subscribe({
      next: (r) => {
        this.uploading.set(false);
        this.result.set(r);
        this.uploaded.emit(r);
        this.state.success('Arquivos analisados com sucesso.');
      },
      error: () => this.uploading.set(false),
    });
  }
}
