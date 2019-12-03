import { ChangeDetectorRef, Component } from '@angular/core';
import { ModalController, NavController } from 'ionic-angular';
import { Subscription } from 'rxjs/Subscription';

import { BackEndService } from '../../services/backend.service';
import { BarcodeService, IScanData } from '../../services/barcode.service';
import { NotificationService } from '../../services/notification.service';
import { ScannerService } from '../../services/scanner.service';
import { BayLocation } from '../../models/bay-location';
import { BayChooser } from '../../components/bay-chooser';

@Component({
  selector: 'page-transfer-rack',
  templateUrl: 'transfer-rack.html'
})
export class TransferRack {
  public bayNumber: string = null;

  public input: {
    barcode: string,
    rackNumber: string,
    bay: BayLocation
  } = {
    barcode: null,
    rackNumber: null,
    bay: null
  };

  constructor(
    private backEndService: BackEndService,
    private barcodeService: BarcodeService,
    private ref: ChangeDetectorRef,
    private modalCtrl: ModalController,
    private navCtrl: NavController,
    private notificationService: NotificationService,
    private scannerService: ScannerService
  ) { }

  ionViewDidEnter() {
    this.scannerService.onScan = barcode => this.onBarcodeEntered(barcode);
  }

  onAcceptClick() {
    const subscription = this.backEndService.updateShippingBay(this.input.rackNumber, this.input.bay.bay_area).subscribe(result => {
      if (result) {
        if(!!this.input.bay) {
          this.notificationService.showTransferred('rack #', this.input.rackNumber, 'bay #', this.input.bay.bay_area);
        } else {
          this.notificationService.showTransferred('rack #', this.input.rackNumber, 'None', '');
        }
      } else {
        if(!!this.input.bay) {
          this.notificationService.showNotTransferred('rack #', this.input.rackNumber, 'bay #', this.input.bay.bay_area);
        } else {
          this.notificationService.showNotTransferred('rack #', this.input.rackNumber, 'None', '');
        }
      }
    });
  }

  onBarcodeEntered(barcode: string) {
    const scanData: IScanData = this.barcodeService.parseBarcode(barcode);

    if (scanData.type === 'rack') {
      this.input.rackNumber = scanData.barcode.slice(1, scanData.barcode.length - 1);
      const subscription = this.backEndService.getBayNumber(this.input.rackNumber).subscribe(bayNumber => {
        this.bayNumber = bayNumber;
        subscription.unsubscribe();
      });
      return;
    }

    this.backEndService.writeLog('TransferRack', scanData, true);
    this.notificationService.showBarcodeInvalidOperation(barcode, scanData.type);
  }

  onClearClick() {
    const subscription = this.backEndService.updateShippingBay(this.input.rackNumber, null).subscribe(result => {
      if (result) {
        this.notificationService.showTransferred('rack #', this.input.rackNumber, 'None', '');
      } else {
        this.notificationService.showNotTransferred('rack #', this.input.rackNumber, 'None', '');
      }
      subscription.unsubscribe();
    });
    this.navCtrl.pop();
  }

  showBayChooser() {
    const modal = this.modalCtrl.create(BayChooser);
    modal.present();
    modal.onDidDismiss((bay: BayLocation) => {
      if (!!bay) {
        this.input.bay = bay;
      }
    });
  }
}
