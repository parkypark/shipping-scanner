import { Component } from '@angular/core';
import { AlertController, NavController, ViewController } from 'ionic-angular';

import { AppSettingsService, Divisions } from '../../services/app-settings.service';
import { AuthenticationService } from '../../services/authentication.service';
import { ScanLogPage } from '../scan-log/scan-log';

@Component({
  selector: 'page-settings',
  template: `
    <ion-list>
      <button ion-item (click)="showSettings()">
        <ion-icon name="settings" item-left></ion-icon>
        Settings
      </button>
      <button ion-item (click)="showScanLog()">
        <ion-icon name="list" item-left></ion-icon>
        Scan Log
      </button>
      <button ion-item (click)="logout()">
        <ion-icon name="log-out" item-left></ion-icon>
        Log Out
      </button>
    </ion-list>
  `
})
export class SettingsPage {
  private division: string;

  constructor(
    private alertCtrl: AlertController,
    private appSettingsService: AppSettingsService,
    private authService: AuthenticationService,
    private navCtrl: NavController,
    private viewCtrl: ViewController
  ) {
    this.division = this.appSettingsService.get('division');
  }

  logout() {
    this.navCtrl.popToRoot(null, () => this.authService.logout());
  }

  showSettings() {
    const alert = this.alertCtrl.create();
    alert.setTitle('Division');

    const divisions = [Divisions.ALUMINUM, Divisions.VINYL];
    for (let division of divisions) {
      alert.addInput({
        type: 'radio',
        label: division,
        value: division,
        checked: this.division === division
      });
    }

    alert.addButton('Cancel');
    alert.addButton({
      text: 'Ok',
      handler: value => {
        this.appSettingsService.set('division', value);
        this.division = value;
      }
    });

    alert.present();
    this.viewCtrl.dismiss();
  }

  showScanLog() {
    this.navCtrl.push(ScanLogPage);
    this.viewCtrl.dismiss();
  }
}
