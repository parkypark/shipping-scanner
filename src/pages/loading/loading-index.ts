import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { BackEndService } from '../../services/backend.service';
import { BarcodeService, IScanData } from '../../services/barcode.service';
import { LoadingPickList } from './loading-picklist';
import { NotificationService } from '../../services/notification.service';
import { ScannerService } from '../../services/scanner.service';

@Component({
  selector: 'page-loading-index',
  templateUrl: 'loading-index.html'
})
export class LoadingIndex {
  public input: { barcode: string } = { barcode: null };
  private allowedScanTypes = ['frame', 'lineitem', 'picklist'];

  constructor(
    private navCtrl: NavController,
    private barcodeService: BarcodeService,
    private notificationService: NotificationService,
    private scannerService: ScannerService,
    private backEndService: BackEndService
  ) { }

  ionViewDidEnter() {
    this.scannerService.onScan = barcode => this.onBarcodeEntered(barcode);
  }

  onBarcodeEntered(barcode: string) {
    const scanData: IScanData = this.barcodeService.parseBarcode(barcode);

    if (!scanData.valid) {
      this.backEndService.writeLog('LoadingIndex', scanData, true);
      this.notificationService.showBarcodeInvalid(barcode);
      return;
    }

    if (this.allowedScanTypes.indexOf(scanData.type) > -1) {
      this.backEndService.writeLog('LoadingIndex', scanData, false);
      this.navCtrl.push(LoadingPickList, { scanData });
    } else {
      this.backEndService.writeLog('LoadingIndex', scanData, true);
      this.notificationService.showBarcodeInvalidOperation(barcode, scanData.type);
    }
  }
}
