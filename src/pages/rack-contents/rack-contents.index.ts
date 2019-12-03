import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { BackEndService } from '../../services/backend.service';
import { BarcodeService, IScanData } from '../../services/barcode.service';
import { RackContentsContentPage } from './rack-contents.content';
import { NotificationService } from '../../services/notification.service';
import { ScannerService } from '../../services/scanner.service';

@Component({
  selector: 'page-rack-contents-index',
  templateUrl: 'rack-contents.index.html'
})
export class RackContentsIndexPage {
  public input: { barcode: string } = { barcode: null };
  private allowedScanTypes = ['rack'];

  constructor(
    private navCtrl: NavController,
    private backEndService: BackEndService,
    private barcodeService: BarcodeService,
    private notificationService: NotificationService,
    private scannerService: ScannerService
  ) { }

  ionViewDidEnter() {
    this.scannerService.onScan = barcode => this.onBarcodeEntered(barcode);
  }

  onBarcodeEntered(barcode: string) {
    const scanData: IScanData = this.barcodeService.parseBarcode(barcode);
    if (!scanData.valid) {
      this.backEndService.writeLog('RackContentsIndex', scanData, true);
      this.notificationService.showBarcodeInvalid(barcode);
      return;
    }

    if (this.allowedScanTypes.indexOf(scanData.type) > -1) {
      this.backEndService.writeLog('RackContentsIndex', scanData, false);
      this.navCtrl.push(RackContentsContentPage, { scanData });
    } else {
      this.backEndService.writeLog('RackContentsIndex', scanData, true);
      this.notificationService.showBarcodeInvalidOperation(barcode, scanData.type);
    }
  }
}
