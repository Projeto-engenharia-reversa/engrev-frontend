import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AppState } from '../../../core/state';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private state = inject(AppState);

  email = signal('');
  password = signal('');
  error = signal('');
  submitting = signal(false);

  onSubmit(): void {
    if (this.submitting()) return;
    this.error.set('');
    this.submitting.set(true);
    this.auth.login(this.email(), this.password()).subscribe({
      next: () => this.router.navigate(['/app/projects']),
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.message ?? 'Falha ao entrar.');
      },
    });
  }
}
