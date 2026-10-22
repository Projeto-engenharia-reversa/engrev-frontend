import { Component, ElementRef, HostListener, inject, OnInit, signal, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ProjectStore } from '../../../core/services/project.store';
import type { Project } from '../../../core/models';

const COLLAPSE_KEY = 'engrev.sidebar.collapsed';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent implements OnInit {
  private auth = inject(AuthService);
  private store = inject(ProjectStore);
  private router = inject(Router);
  private footerRef = viewChild<ElementRef<HTMLElement>>('footerRef');

  user = this.auth.user;
  projects = this.store.projects;
  collapsed = signal(localStorage.getItem(COLLAPSE_KEY) === '1');
  menuOpen = signal(false);
  creating = signal(false);
  editingId = signal<number | null>(null);
  editingName = signal('');
  confirmId = signal<number | null>(null);

  ngOnInit(): void {
    this.store.refresh();
  }

  storeLoaded(): boolean {
    return this.store.loaded();
  }

  get initial(): string {
    const u = this.user();
    return (u?.name ?? u?.email ?? '?')[0]?.toUpperCase() ?? '?';
  }

  get displayName(): string {
    return this.user()?.name ?? this.user()?.email ?? '';
  }

  toggleCollapsed(): void {
    this.collapsed.update((c) => !c);
    localStorage.setItem(COLLAPSE_KEY, this.collapsed() ? '1' : '0');
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: Event): void {
    const el = this.footerRef()?.nativeElement;
    if (el && !el.contains(event.target as Node)) {
      this.closeMenu();
    }
  }

  createProject(): void {
    if (this.creating()) return;
    this.creating.set(true);
    this.store.create().subscribe({
      next: () => this.creating.set(false),
      error: () => this.creating.set(false),
    });
  }

  startRename(p: Project): void {
    this.editingId.set(p.id);
    this.editingName.set(p.name);
    this.confirmId.set(null);
  }

  cancelRename(): void {
    this.editingId.set(null);
  }

  saveRename(): void {
    const id = this.editingId();
    const name = this.editingName().trim();
    this.editingId.set(null);
    if (id === null || !name) return;
    this.store.rename(id, name).subscribe();
  }

  toggleDelete(id: number): void {
    this.confirmId.update((c) => (c === id ? null : id));
  }

  cancelDelete(): void {
    this.confirmId.set(null);
  }

  confirmDelete(id: number): void {
    this.store.remove(id).subscribe();
    this.confirmId.set(null);
  }

  goAccount(): void {
    this.closeMenu();
    this.router.navigate(['/app/account']);
  }

  logout(): void {
    this.closeMenu();
    this.auth.logout();
  }
}
