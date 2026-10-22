import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AppState } from '../../../core/state';

@Component({
  selector: 'app-account-management',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './account-management.component.html',
  styleUrl: './account-management.component.css',
})
export class AccountManagementComponent {
  private auth = inject(AuthService);
  private state = inject(AppState);

  user = this.auth.user;
  name = signal('');
  password = signal('');
  confirm = signal('');
  saving = signal(false);
  error = signal('');

  constructor() {
    this.name.set(this.user()?.name ?? '');
  }

  onSave(): void {
    this.error.set('');
    if (this.password() && this.password() !== this.confirm()) {
      this.error.set('As senhas não coincidem.');
      return;
    }
    if (this.password() && this.password().length < 6) {
      this.error.set('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    this.saving.set(true);
    this.auth.updateMe(this.name().trim(), this.password() || undefined).subscribe({
      next: () => {
        this.saving.set(false);
        this.password.set('');
        this.confirm.set('');
        this.state.success('Perfil atualizado.');
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Falha ao atualizar o perfil.');
      },
    });
  }
}
