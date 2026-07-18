import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Header } from '../../components/header/header';
import { Sidebar } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Sidebar, Header],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {}
