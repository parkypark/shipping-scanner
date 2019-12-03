import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { BackEndService } from '../../services/backend.service';
import { BarcodeService, IScanData } from '../../services/barcode.service';
import { NotificationService } from '../../services/notification.service';
import { ScannerService } from '../../services/scanner.service';
import { TransferItem } from './transfer-item';
import { TransferRack } from './transfer-rack';

@Component({
  selector: 'page-transfer-index',
  templateUrl: 'transfer-index.html'
})
export class TransferIndex {
  public input: { barcode: string } = { barcode: null };

  constructor(
    private navCtrl: NavController,
    private backEndService: BackEndService,
    private barcodeService: BarcodeService,
    private notificationService: NotificationService,
    private scannerService: ScannerService
  ) { }

  ionViewDidEnter() {
    this.scannerService.onScan = barcode => {
      const scanData: IScanData = this.barcodeService.parseBarcode(barcode);
      this.notificationService.showBarcodeInvalidOperation(barcode, scanData.type);
      console.log('scanned a barcode, but this page doesn\'t accept them');
    };
  }

  gotoItemTransfer() {
    this.navCtrl.push(TransferItem);
  }

  gotoRackTransfer() {
    this.navCtrl.push(TransferRack);
  }

  onBarcodeEntered(barcode: string) {
    const scanData: IScanData = this.barcodeService.parseBarcode(barcode);
    if (!scanData.valid) {
      this.backEndService.writeLog('TransferIndex', scanData, true);
      this.notificationService.showBarcodeInvalid(barcode);
      return;
    }

    if (scanData.type === 'frame' || scanData.type === 'lineitem') {
      this.backEndService.writeLog('TransferIndex', scanData, false);
      this.navCtrl.push(TransferItem, { barcode: scanData.barcode });
    } else if (scanData.type === 'rack') {
      this.backEndService.writeLog('TransferIndex', scanData, false);
      this.navCtrl.push(TransferRack, { barcode: scanData.barcode });
    } else {
      this.backEndService.writeLog('TransferIndex', scanData, true);
      this.notificationService.showBarcodeInvalidOperation(barcode, scanData.type);
    }
  }
}
