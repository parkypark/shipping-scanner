import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { AppSettingsService } from '../../services/app-settings.service';
import { BackEndService } from '../../services/backend.service';
import { BarcodeService, IScanData } from '../../services/barcode.service';
import { IPicklistItem } from '../../models/picklist-item';
import { NetworkMonitorService } from '../../services/network-monitor.service';
import { NotificationService } from '../../services/notification.service';
import { ScannerService } from '../../services/scanner.service';

@Component({
  selector: 'page-unloading',
  templateUrl: 'unloading.html'
})
export class UnloadingPage {
  public input: { barcode: string, racknumber: string } = { barcode: null, racknumber: null };
  public items: IPicklistItem[] = [];

  constructor(
    public networkMonitorService: NetworkMonitorService,
    private navCtrl: NavController,
    private navParams: NavParams,
    private appSettingsService: AppSettingsService,
    private backEndService: BackEndService,
    private barcodeService: BarcodeService,
    private notificationService: NotificationService,
    private scannerService: ScannerService
  ) { }

  ionViewDidEnter() {
    this.scannerService.onScan = barcode => this.onBarcodeEntered(barcode);
  }

  isValid() {
    return this.input.racknumber && this.items.length > 0;
  }

  onAcceptClick() {
    for (let item of this.items) {
      item.racknumber = this.input.racknumber;
      item.scantime = new Date();
      item.status = 1200;
      item.what = 'unload';
    }

    this.backEndService.updateItems(this.items, 'Unloaded').subscribe(result => {
      if (result) {
        this.notificationService.showUnloaded(this.items.length, this.input.racknumber);
      } else {
        this.notificationService.showNotUnloaded();
      }
    });

    this.navCtrl.pop();
  }

  onBarcodeEntered(barcode: string) {
    const scanData: IScanData = this.barcodeService.parseBarcode(barcode);
    if (!scanData.valid) {
      this.backEndService.writeLog('Unload', scanData, true);
      this.notificationService.showBarcodeInvalid(barcode);
      return;
    }

    if (this.items.find((item) => item.barcode === scanData.barcode)) {
      this.notificationService.showItemAlreadyScanned(scanData.barcode);
      return;
    }

    if (scanData.type === 'frame' || scanData.type === 'lineitem') {
      const orderNumber = scanData.barcode.slice(1, 7);
      const itemNumber = scanData.barcode.slice(7, 10);
      const subscription = this.backEndService.getItem(orderNumber, itemNumber).subscribe(item => {
        if (item) {
          this.items.push(item);
        } else {
          this.notificationService.showItemNotFound(scanData.barcode);
        }
        subscription.unsubscribe();
      });
    } else if (scanData.type === 'screen') {
      const subscription = this.backEndService.getItemFromScreenBarcode(scanData.barcode).subscribe(item => {
        if (item) {
          this.items.push(item);
        } else {
          this.notificationService.showItemNotFound(scanData.barcode);
        }
        subscription.unsubscribe();
      });
    } else if (scanData.type === 'SU') {
      const subscription = this.backEndService.getItemFromSUBarcode(scanData.barcode).subscribe(item => {
        if (item) {
          this.items.push(item);
        } else {
          this.notificationService.showItemNotFound(scanData.barcode);
        }
        subscription.unsubscribe();
      });
    } else if (scanData.type === 'rack') {
      this.input.racknumber = scanData.barcode.substr(1, scanData.barcode.length - 2);
    } else {
      this.backEndService.writeLog('Unload', scanData, true);
      this.notificationService.showBarcodeInvalidOperation(barcode, scanData.type);
    }
  }
}
