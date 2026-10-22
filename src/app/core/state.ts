import { computed, Injectable, signal } from '@angular/core';
import type { Toast } from './models';

@Injectable({ providedIn: 'root' })
export class AppState {
  readonly toasts = signal<Toast[]>([]);
  private readonly _loading = signal(0);
  readonly loading = computed(() => this._loading() > 0);
  private seq = 0;

  beginLoading(): void {
    this._loading.update((v) => v + 1);
  }

  endLoading(): void {
    this._loading.update((v) => Math.max(0, v - 1));
  }

  pushToast(type: Toast['type'], message: string): void {
    const id = ++this.seq;
    this.toasts.update((list) => [...list, { id, type, message }]);
    setTimeout(() => this.dismissToast(id), 4200);
  }

  dismissToast(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  success(message: string): void {
    this.pushToast('success', message);
  }

  error(message: string): void {
    this.pushToast('error', message);
  }

  info(message: string): void {
    this.pushToast('info', message);
  }
}
