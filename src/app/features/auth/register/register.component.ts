import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  name = signal('');
  email = signal('');
  password = signal('');
  confirm = signal('');
  error = signal('');
  submitting = signal(false);

  onSubmit(): void {
    this.error.set('');
    if (this.password() !== this.confirm()) {
      this.error.set('As senhas não coincidem.');
      return;
    }
    if (this.password().length < 6) {
      this.error.set('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    this.submitting.set(true);
    this.auth.register(this.email(), this.password(), this.name() || undefined).subscribe({
      next: () => this.router.navigate(['/app/projects']),
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.message ?? 'Falha ao cadastrar.');
      },
    });
  }
}
