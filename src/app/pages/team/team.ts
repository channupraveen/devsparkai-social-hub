import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Team, TeamMemberItem, TeamRole } from '../../services/team';
import { Toast } from '../../services/toast';

const ROLE_BLURBS: Record<string, string> = {
  owner: 'Full control of the workspace',
  admin: 'Manage posts, channels and members',
  editor: 'Create and schedule posts',
  viewer: 'View content and analytics',
};

@Component({
  selector: 'app-team',
  imports: [FormsModule, DatePipe],
  templateUrl: './team.html',
  styleUrl: './team.scss',
})
export class TeamPage implements OnInit {
  private api = inject(Team);
  private toast = inject(Toast);

  readonly roles: TeamRole[] = ['admin', 'editor', 'viewer'];

  readonly members = signal<TeamMemberItem[]>([]);
  readonly isLoading = signal(true);
  readonly inviting = signal(false);
  readonly busyId = signal<number | null>(null);

  inviteEmail = '';
  inviteRole: TeamRole = 'editor';

  ngOnInit(): void {
    this.api.list().subscribe({
      next: (members) => {
        this.members.set(members);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Could not load your team.', 'Team');
      },
    });
  }

  roleBlurb(role: string): string {
    return ROLE_BLURBS[role] ?? '';
  }

  initials(member: TeamMemberItem): string {
    const source = member.name || member.email;
    return source
      .split(/[\s@.]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  invite(): void {
    const email = this.inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      this.toast.warning('Enter a valid email address.');
      return;
    }

    this.inviting.set(true);
    this.api.invite(email, this.inviteRole).subscribe({
      next: (member) => {
        this.inviting.set(false);
        this.inviteEmail = '';
        this.members.update((list) => [...list, member]);
        const note =
          member.status === 'active'
            ? `${member.email} already has an account — added as ${member.role}.`
            : `Invite recorded for ${member.email}. They'll be linked when they register.`;
        this.toast.success(note, 'Member added');
      },
      error: (error) => {
        this.inviting.set(false);
        const detail =
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Could not send the invite.';
        this.toast.error(detail, 'Invite failed');
      },
    });
  }

  changeRole(member: TeamMemberItem, role: string): void {
    this.busyId.set(member.id);
    this.api.updateRole(member.id, role as TeamRole).subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.members.update((list) =>
          list.map((m) => (m.id === updated.id ? updated : m)),
        );
        this.toast.success(`${updated.email} is now ${updated.role}.`, 'Role updated');
      },
      error: () => {
        this.busyId.set(null);
        this.toast.error('Could not update the role.');
      },
    });
  }

  remove(member: TeamMemberItem): void {
    if (!confirm(`Remove ${member.email} from the team?`)) return;

    this.busyId.set(member.id);
    this.api.remove(member.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.members.update((list) => list.filter((m) => m.id !== member.id));
        this.toast.info(`${member.email} removed.`, 'Team');
      },
      error: () => {
        this.busyId.set(null);
        this.toast.error('Could not remove the member.');
      },
    });
  }
}
