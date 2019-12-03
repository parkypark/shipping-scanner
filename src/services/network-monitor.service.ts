import { Inject, Injectable } from '@angular/core';
import { Network } from '@ionic-native/network';
import { Alert, AlertController, Events, Platform } from 'ionic-angular';

@Injectable()
export class NetworkMonitorService {
  public isOnline: boolean;
  private disconnectedAlert: Alert;
  private disconnectedAlertOpen: boolean = false;

  constructor(
    @Inject(Network) private network: Network,
    private alertCtrl: AlertController,
    private events: Events,
    private platform: Platform
  ) {
    this.disconnectedAlert = this.alertCtrl.create({
      title: "Network Disconnected",
      subTitle: 'Check your connection',
      enableBackdropDismiss: false,
      buttons: [
        {
          text: 'Cancel',
          handler: () => {
            this.platform.exitApp();
            return false;
          }
        }
      ]
    });
  }

  public start() {
    this.isOnline = this.network.type !== 'none';

    this.network.onDisconnect().subscribe(() => {
      console.log('Network disconnected');
      this.isOnline = false;
      this.events.publish('network.disconnected');
    });

    this.network.onConnect().subscribe(() => {
      console.log('Network connected');
      this.isOnline = true;
      this.events.publish('network.connected');
    });
  }

  public showDisconnectedAlert() {
    if (!this.disconnectedAlertOpen) {
      this.disconnectedAlertOpen = true;
      this.disconnectedAlert.present();
    }
  }

  public hideDisconnectedAlert() {
    this.disconnectedAlert.dismiss().then(() => {
      this.disconnectedAlertOpen = false;
    });
  }
}
