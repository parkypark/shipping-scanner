import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { AppSettingsService, Divisions } from '../../services/app-settings.service';
import { BackEndService } from '../../services/backend.service';
import { BarcodeService, IScanData } from '../../services/barcode.service';
import { IPicklistItem } from '../../models/picklist-item';
import { NetworkMonitorService } from '../../services/network-monitor.service';
import { NotificationService } from '../../services/notification.service';
import { ScannerService } from '../../services/scanner.service';

@Component({
  selector: 'page-return',
  templateUrl: 'return.html'
})
export class ReturnPage {
  public input: { barcode: string, racknumber: string } = { barcode: null, racknumber: null };
  public items: IPicklistItem[] = [];
  public returnStatus: number;

  public returnStatuses = [
    {statusid: 1550, description: 'Return - Production'},
    {statusid: 1551, description: 'Return - Boneyard'},
    {statusid: 1552, description: 'Return - Unable to Pick Up'}
  ];

  constructor(
    public networkMonitorService: NetworkMonitorService,
    private navCtrl: NavController,
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
    return this.input.racknumber && this.items.length > 0 &&
      (!this.isVinylDivision() || this.returnStatus > 1500);
  }

  isVinylDivision() {
    return this.appSettingsService.getDivisionId() === Divisions.ID_VINYL;
  }

  onAcceptClick() {
    if (!this.isVinylDivision()) {
      this.returnStatus = 1500;
    }

    for (let item of this.items) {
      item.status = this.returnStatus;
      item.racknumber = this.returnStatus === 1552 ? '0' : this.input.racknumber;
      item.scantime = new Date();
      item.what = 'return';
    }

    this.backEndService.updateItems(this.items, 'Returned').subscribe(result => {
      if (result) {
        this.notificationService.showReturned(this.items.length, this.input.racknumber);
      } else {
        this.notificationService.showNotReturned();
      }
    });

    this.navCtrl.pop();
  }

  onBarcodeEntered(barcode: string) {
    const scanData: IScanData = this.barcodeService.parseBarcode(barcode);
    if (!scanData.valid) {
      this.backEndService.writeLog('Return', scanData, true);
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
        }
        subscription.unsubscribe();
      });
    } else if (scanData.type === 'screen') {
      const subscription = this.backEndService.getItemFromScreenBarcode(scanData.barcode).subscribe(item => {
        if (item) {
          this.items.push(item);
        }
        subscription.unsubscribe();
      });
    } else if (scanData.type === 'SU') {
      const subscription = this.backEndService.getItemFromSUBarcode(scanData.barcode).subscribe(item => {
        if (item) {
          this.items.push(item);
        }
        subscription.unsubscribe();
      });
    } else if (scanData.type === 'rack') {
      this.input.racknumber = scanData.barcode.substr(1, scanData.barcode.length - 2);
    } else {
      this.backEndService.writeLog('Return', scanData, true);
      this.notificationService.showBarcodeInvalidOperation(barcode, scanData.type);
    }
  }
}
