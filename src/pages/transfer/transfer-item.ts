import { Component } from '@angular/core';
import { ModalController, NavController, NavParams, ToastController } from 'ionic-angular';
import { Subscription } from 'rxjs/Subscription';

import { AppSettingsService } from '../../services/app-settings.service';
import { BackEndService } from '../../services/backend.service';
import { BarcodeService, IScanData } from '../../services/barcode.service';
import { BayChooser } from '../../components/bay-chooser';
import { BayLocation } from '../../models/bay-location';
import { IPicklistItem } from '../../models/picklist-item';
import { NotificationService } from '../../services/notification.service';
import { ScannerService } from '../../services/scanner.service';

@Component({
  selector: 'page-transfer-item',
  templateUrl: 'transfer-item.html'
})
export class TransferItem {
  public input: { barcode: string, racknumber: string, bay: BayLocation} = { barcode: null, racknumber: null, bay: null };
  public items: IPicklistItem[] = [];

  constructor(
    private modalCtrl: ModalController,
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

  isAcceptEnabled() {
    return (this.input.racknumber || this.input.bay) && this.items.length > 0;
  }

  onAcceptClick() {
    for (let item of this.items) {
      item.what = 'rack';
      item.racknumber = this.input.racknumber || this.input.bay.bay_area;
    }

    this.backEndService.updateItems(this.items, 'Transfered').subscribe(result => {
      if (result) {
        this.notificationService.showTransferred(this.items.length.toString(), ' items', 'rack #', this.input.racknumber);
      } else {
        this.notificationService.showNotTransferred(this.items.length.toString(), ' items', 'rack #', this.input.racknumber);
      }
    });

    this.navCtrl.pop();
  }

  onClearClick() {
    if (!this.input.racknumber) {
      return;
    }

    const subscription = this.backEndService.clearRackContents(this.input.racknumber).subscribe(result => {
      this.notificationService.showRackCleared(this.input.racknumber);
      subscription.unsubscribe();
    });
  }

  onBarcodeEntered(barcode: string) {
    const scanData: IScanData = this.barcodeService.parseBarcode(barcode);
    if (!scanData.valid) {
      this.backEndService.writeLog('TransferItem', scanData, true);
      this.notificationService.showBarcodeInvalid(barcode);
      return;
    }

    if (this.items.find((item) => item.barcode === scanData.barcode)) {
      this.notificationService.showItemAlreadyScanned(scanData.barcode);
      return;
    }

    if (scanData.type === 'rack') {
      this.backEndService.writeLog('TransferItem', scanData, false);
      this.input.bay = null;
      this.input.racknumber = scanData.barcode.replace('X', '').replace('V', '');
    } else if (scanData.type === 'frame' || scanData.type === 'lineitem') {
      const orderNumber = scanData.barcode.slice(1, 7);
      const itemNumber = scanData.barcode.slice(7, 10);
      const subscription = this.backEndService.getItem(orderNumber, itemNumber).subscribe(item => {
        this.items.push(item);
        subscription.unsubscribe();
      });
    } else if (scanData.type === 'screen') {
      const subscription = this.backEndService.getItemFromScreenBarcode(scanData.barcode).subscribe(item => {
        this.items.push(item);
        subscription.unsubscribe();
      });
    } else if (scanData.type === 'SU') {
      const subscription = this.backEndService.getItemFromSUBarcode(scanData.barcode).subscribe(item => {
        this.items.push(item);
        subscription.unsubscribe();
      });
    } else {
      this.backEndService.writeLog('TransferItem', scanData, true);
      this.notificationService.showBarcodeInvalidOperation(barcode, scanData.type);
    }
  }

  showBayChooser() {
    const modal = this.modalCtrl.create(BayChooser);
    modal.present();
    modal.onDidDismiss((bay: BayLocation) => {
      if (!!bay) {
        this.input.bay = bay;
        this.input.racknumber = null;
      }
    });
  }
}
