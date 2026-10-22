import { Component, inject } from '@angular/core';
import { AppState } from '../../../core/state';

@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
})
export class ToastComponent {
  private state = inject(AppState);
  toasts = this.state.toasts;

  dismiss(id: number): void {
    this.state.dismissToast(id);
  }
}
