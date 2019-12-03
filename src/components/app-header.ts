import { Component, Input } from '@angular/core';
import { PopoverController } from 'ionic-angular';

import { AppSettingsService } from '../services/app-settings.service';
import { NetworkMonitorService } from '../services/network-monitor.service';
import { SettingsPage } from '../pages/settings/settings';

@Component({
  selector: 'app-header',
  template: `
    <ion-navbar [color]="getColour()">
      <button ion-button menuToggle>
        <ion-icon name="menu"></ion-icon>
      </button>
      <ion-title>{{division()}} {{title}}</ion-title>
      <ion-buttons end>
        <button ion-button icon-only (click)="showSettingsMenu($event)">
          <ion-icon name="more"></ion-icon>
        </button>
      </ion-buttons>
    </ion-navbar>
  `
})
export class AppHeader {
  @Input() title: string;

  constructor(
    private popoverCtrl: PopoverController,
    private appSettingsService: AppSettingsService,
    private networkMonitorService: NetworkMonitorService
  ) { }

  division() {
    const division: string = this.appSettingsService.get('division');
    if (division && division.length > 0) {
      return `[${division[0]}]`;
    }
    return null;
  }

  getColour() {
    return this.networkMonitorService.isOnline ? 'primary' : 'danger';
  }

  showSettingsMenu(ev) {
    const popover = this.popoverCtrl.create(SettingsPage);
    popover.present({ ev });
  }
}
