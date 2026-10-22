import { inject } from '@angular/core';
import { Router, type Routes } from '@angular/router';
import { AuthService } from './core/services/auth.service';

function requireAuth(): boolean {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) {
    return true;
  }
  return inject(Router).createUrlTree(['/login']) as unknown as boolean;
}

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'app' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'app',
    canActivate: [requireAuth],
    loadComponent: () => import('./features/layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'projects' },
      {
        path: 'projects',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'projects/:id/analysis/:runId',
        loadComponent: () => import('./features/analysis/analysis-screen/analysis-screen.component').then((m) => m.AnalysisScreenComponent),
      },
      {
        path: 'projects/:id',
        loadComponent: () => import('./features/analysis/result/result.component').then((m) => m.ResultComponent),
      },
      {
        path: 'account',
        loadComponent: () => import('./features/account/account-management/account-management.component').then((m) => m.AccountManagementComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'app' },
];
