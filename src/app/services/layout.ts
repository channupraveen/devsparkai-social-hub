import { Injectable, signal } from '@angular/core';

/** Shared UI layout state (mobile sidebar drawer). */
@Injectable({ providedIn: 'root' })
export class LayoutState {
  readonly sidebarOpen = signal(false);

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}
