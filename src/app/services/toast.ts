import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class Toast {
  private nextId = 0;

  readonly toasts = signal<ToastMessage[]>([]);

  success(message: string, title = 'Success'): void {
    this.show('success', title, message);
  }

  error(message: string, title = 'Error'): void {
    this.show('error', title, message);
  }

  info(message: string, title = 'Info'): void {
    this.show('info', title, message);
  }

  warning(message: string, title = 'Warning'): void {
    this.show('warning', title, message);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private show(type: ToastType, title: string, message: string): void {
    const toast: ToastMessage = { id: ++this.nextId, type, title, message };
    this.toasts.update((list) => [...list, toast]);

    setTimeout(() => this.dismiss(toast.id), 4000);
  }
}
