import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Subscription } from 'rxjs/Subscription';
import { BackEndService } from '../../services/backend.service';
import { ScannerService } from '../../services/scanner.service';
import { RackData } from '../../models/rack-data';

@Component({
  selector: 'page-rack-contents-content',
  templateUrl: 'rack-contents.content.html'
})
export class RackContentsContentPage {
  public rack: RackData = {
    racknumber: null,
    location: null,
    data: []
  };

  private subscriptions: Subscription[] = [];
  private isLoading: boolean;

  constructor(
    private navCtrl: NavController,
    private navParams: NavParams,
    private backEndService: BackEndService,
    private scannerService: ScannerService
  ) {
  }

  ionViewDidEnter() {
    const scanData = this.navParams.get('scanData');
    const rackNumber = scanData.barcode.slice(1, scanData.barcode.length - 1);

    if (rackNumber !== '0') {
      this.isLoading = true;
      this.subscriptions.push(this.backEndService.getItemsByRackNumber(rackNumber).subscribe(
        (rack: RackData) => {
          this.rack = rack;
          this.isLoading = false;
        },
        error => {
          this.isLoading = false;
          console.error(error);
        }
      ));
    }

    this.scannerService.onScan = barcode => {
      this.backEndService.writeLog('RackContentsContents', scanData, true);
      console.log('scanned a barcode, but this page doesn\'t accept them');
    };
  }

  ionViewDidLeave() {
    for (let subscription of this.subscriptions) {
      if (!subscription.closed) {
        subscription.unsubscribe();
      }
    }
  }
}
