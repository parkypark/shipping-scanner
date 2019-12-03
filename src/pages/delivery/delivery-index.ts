import { ChangeDetectorRef, Component } from '@angular/core';
import { Events, LoadingController, NavController, NavParams } from 'ionic-angular';
import { CacheService } from 'ionic-cache';
import { Storage } from '@ionic/storage';
import { AppSettingsService, Divisions } from '../../services/app-settings.service';
import { BackEndService } from '../../services/backend.service';
import { BarcodeService, IScanData } from '../../services/barcode.service';
import { Branches } from '../../models/branchMeta';
import { DeliveryLoadListPage } from './delivery-loadlist';
import { DeliveryOrder } from './delivery-order';
import { NetworkMonitorService } from '../../services/network-monitor.service';
import { NotificationService } from '../../services/notification.service';
import { ScannerService } from '../../services/scanner.service';
import { BranchMeta, IBranchMeta } from '../../models/branchMeta';

@Component({
 selector: 'page-delivery-index',
 templateUrl: 'delivery-index.html'
})
export class DeliveryIndex {
  public ALLOW_SCAN_LOADLIST: boolean = false;
  public input: { barcode: string } = { barcode: null };

  constructor(
    private cache: CacheService,
    private loadingCtrl: LoadingController,
    private navCtrl: NavController,
    private storage: Storage,
    private appSettingsService: AppSettingsService,
    private backEndService: BackEndService,
    private barcodeService: BarcodeService,
    private networkMonitorService: NetworkMonitorService,
    private notificationService: NotificationService,
    private scannerService: ScannerService,
    private ref: ChangeDetectorRef
  ) {
  }

  ionViewDidEnter() {
    this.scannerService.onScan = barcode => this.onBarcodeEntered(barcode);
  }

  download(branch: string) {
    const loading = this.loadingCtrl.create({content: 'Please wait...'});
    loading.present();

    const subscription = this.backEndService.getWorkorders(branch).subscribe(result => {
      loading.dismiss();
      this.notificationService.showWorkordersDownloaded(result);
    }, () => {
      loading.dismiss();
      this.notificationService.showWorkordersNotDownloaded();
    }, () => {
      subscription.unsubscribe();
    });
  }

  getBranches() {
    return this.appSettingsService.get('division') === Divisions.VINYL
      ? this.backEndService.branchMeta
      : this.backEndService.branchMeta.filter(b => b.code === Branches.LOCAL);
  }

  onBarcodeEntered(barcode: string) {
    const scanData: IScanData = this.barcodeService.parseBarcode(barcode);
    if (!scanData.valid) {
      this.backEndService.writeLog('DeliveryIndex', scanData, true);
      this.notificationService.showBarcodeInvalid(barcode);
      return;
    }

    const allowedScanTypes = ['frame', 'lineitem', 'workorder'];
    if (this.ALLOW_SCAN_LOADLIST) {
      allowedScanTypes.push('picklist');
    }

    if (allowedScanTypes.indexOf(scanData.type) === -1) {
      this.backEndService.writeLog('DeliveryIndex', scanData, true);
      this.notificationService.showBarcodeInvalidOperation(barcode, scanData.type);
      return;
    }

    this.backEndService.writeLog('DeliveryIndex', scanData, false);
    if (scanData.type === 'picklist' && this.ALLOW_SCAN_LOADLIST) { // picklist and loadlist are same id
      this.navCtrl.push(DeliveryLoadListPage, { scanData });
    } else {
      this.navCtrl.push(DeliveryOrder, { scanData });
    }
  }
}
