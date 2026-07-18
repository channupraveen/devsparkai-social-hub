import { Routes } from '@angular/router';

import { authGuard } from './guards/auth-guard';
import { AuthLayout } from './layouts/auth-layout/auth-layout';
import { MainLayout } from './layouts/main-layout/main-layout';
import { Analytics } from './pages/analytics/analytics';
import { ContentCalendar } from './pages/content-calendar/content-calendar';
import { ContentPlanner } from './pages/content-planner/content-planner';
import { CreatePost } from './pages/create-post/create-post';
import { Dashboard } from './pages/dashboard/dashboard';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { ScheduledPosts } from './pages/scheduled-posts/scheduled-posts';
import { Settings } from './pages/settings/settings';
import { SocialAccounts } from './pages/social-accounts/social-accounts';
import { TeamPage } from './pages/team/team';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: Dashboard,
        title: 'Dashboard | DevSparkAI Social Hub',
      },
      {
        path: 'content-calendar',
        component: ContentCalendar,
        title: 'Content Calendar | DevSparkAI Social Hub',
      },
      {
        path: 'content-planner',
        component: ContentPlanner,
        title: 'Content Planner | DevSparkAI Social Hub',
      },
      {
        path: 'create-post',
        component: CreatePost,
        title: 'Create Post | DevSparkAI Social Hub',
      },
      {
        path: 'scheduled-posts',
        component: ScheduledPosts,
        title: 'Scheduled Posts | DevSparkAI Social Hub',
      },
      {
        path: 'analytics',
        component: Analytics,
        title: 'Analytics | DevSparkAI Social Hub',
      },
      {
        path: 'social-accounts',
        component: SocialAccounts,
        title: 'Social Accounts | DevSparkAI Social Hub',
      },
      {
        path: 'team',
        component: TeamPage,
        title: 'Team | DevSparkAI Social Hub',
      },
      {
        path: 'settings',
        component: Settings,
        title: 'Settings | DevSparkAI Social Hub',
      },
    ],
  },
  {
    path: '',
    component: AuthLayout,
    children: [
      {
        path: 'login',
        component: Login,
        title: 'Login | DevSparkAI Social Hub',
      },
      {
        path: 'register',
        component: Register,
        title: 'Register | DevSparkAI Social Hub',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
