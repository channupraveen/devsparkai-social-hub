import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Header } from '../../components/header/header';
import { Sidebar } from '../../components/sidebar/sidebar';
import { LayoutState } from '../../services/layout';
import { inject } from '@angular/core';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Sidebar, Header],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  readonly layout = inject(LayoutState);
}
