import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppState } from './core/state';
import { SpinnerComponent } from './features/shared/spinner/spinner.component';
import { ToastComponent } from './features/shared/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, SpinnerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private state = inject(AppState);
  loading = this.state.loading;
}
