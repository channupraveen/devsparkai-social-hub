import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth, AuthUser } from '../../services/auth';
import { Toast } from '../../services/toast';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit {
  private auth = inject(Auth);
  private router = inject(Router);
  private toast = inject(Toast);

  readonly user = signal<AuthUser | null>(null);

  readonly sections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
        { label: 'Analytics', route: '/analytics', icon: 'analytics' },
      ],
    },
    {
      title: 'Content',
      items: [
        { label: 'Content Planner', route: '/content-planner', icon: 'planner' },
        { label: 'Create Post', route: '/create-post', icon: 'create' },
        { label: 'Content Calendar', route: '/content-calendar', icon: 'calendar' },
        { label: 'Scheduled Posts', route: '/scheduled-posts', icon: 'clock' },
      ],
    },
    {
      title: 'Workspace',
      items: [
        { label: 'Social Accounts', route: '/social-accounts', icon: 'accounts' },
        { label: 'Team', route: '/team', icon: 'team' },
        { label: 'Settings', route: '/settings', icon: 'settings' },
      ],
    },
  ];

  ngOnInit(): void {
    this.auth.me().subscribe({
      next: (user) => this.user.set(user),
      error: () => this.user.set(null),
    });
  }

  initials(): string {
    const name = this.user()?.name ?? '';
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'DS';
  }

  logout(): void {
    this.auth.logout();
    this.toast.info('You have been logged out.', 'Signed out');
    this.router.navigate(['/login']);
  }
}
