import { Component, ViewChild } from '@angular/core';
import { AlertController, Content, Events, NavController, NavParams } from 'ionic-angular';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subscription } from 'rxjs/Subscription';

import { AppSettingsService, Divisions } from '../../services/app-settings.service';
import { DeliveryConfirmationPage } from './delivery-confirmation';
import { PickListItem } from '../../models/picklist-item';
import { Header } from '../../models/header';
import { BackEndService } from '../../services/backend.service';
import { BarcodeService, IScanData } from '../../services/barcode.service';
import { NotificationService } from '../../services/notification.service';
import { ScannerService } from '../../services/scanner.service';

@Component({
  selector: 'page-delivery-order',
  templateUrl: 'delivery-order.html'
})
export class DeliveryOrder {
  public hasData: boolean = false;
  public isLoading: boolean = true;
  public input: { barcode: string } = { barcode: null };
  public orderNumber: string;
  public workorder: PickListItem[];
  public productionHeader: Header;

  @ViewChild(Content) content: Content;

  private backup: PickListItem[];
  private scrollTo: BehaviorSubject<string> = new BehaviorSubject(null);
  private subscriptions: Subscription[] = [];
  private total: { items: number, completed: number };
  private isCheckAllUsed: boolean = false;
  private isNextClicked: boolean = false;
  private isDeliverRack: boolean = false;

  constructor(
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private navParams: NavParams,
    private appSettings: AppSettingsService,
    private backEndService: BackEndService,
    private barcodeService: BarcodeService,
    private notificationService: NotificationService,
    private scannerService: ScannerService
  ) { }

  getCompletion(): string {
    if (! this.hasData) {
      return null;
    }
    return `${this.total.completed} / ${this.total.items}`;
  }

  ionViewCanLeave(): Promise<{}> {
    return new Promise((resolve, reject) => {
      if (this.isNextClicked) {
        return resolve();
      }

      let hasScanned = false;
      for (let item of this.workorder) {
        if (item.what) {
          hasScanned = true;
          break;
        }
      }

      if (!hasScanned) {
        return resolve();
      }

      this.alertCtrl.create({
        title: 'Leave Page?',
        message: 'There are unsaved changes to this work order',
        buttons: [
          { text: 'Yes', handler: () => resolve(), },
          { text: 'No', handler: () => reject() }
        ],
      }).present();
    });
  }

  ionViewDidEnter() {
    const scanData = this.navParams.get('scanData');

    if (scanData.barcode[scanData.barcode.length -1] === 'V') {
      const orderNumber = scanData.barcode.slice(1, 7);
      const itemNumber = scanData.barcode.slice(7, 10);
      this.loadWorkOrder(orderNumber, itemNumber);
    } else {
      this.loadWorkOrder(scanData.barcode);
    }

    this.subscriptions.push(this.scrollTo.subscribe(value => this.scrollToElement(value)));
    this.scannerService.onScan = barcode => this.onBarcodeEntered(barcode);
    this.isNextClicked = false;
  }

  ionViewDidLeave() {
    for (let subscription of this.subscriptions) {
      if (!subscription.closed) {
        subscription.unsubscribe();
      }
    }
  }

  public isCheckAllAvailable() {
    return true; //this.appSettings.getDivisionId() === 0;
  }

  public isDeliverRackAvailable() {
    const division = this.appSettings.get('division');
    if (division === Divisions.ALUMINUM) {
      return true;
    }

    if (this.productionHeader && this.productionHeader.isproject) {
      return true;
    }

    return false;
  }

  public isItemLoaded(item: PickListItem) {
    return item.status === 1300 || item.status === 1400 || (item.loadingcomplete !== '0000-00-00 00:00:00' && item.status >= 1300);
  }

  public isNextEnabled() {
    if (this.isLoading || !this.hasData || this.isNextClicked) {
      return false;
    }
    return true;
  }

  public onBarcodeEntered(barcode: string) {
    const scanData: IScanData = this.barcodeService.parseBarcode(barcode);
    if (!scanData.valid) {
      this.backEndService.writeLog('DeliveryOrder', scanData, true);
      this.notificationService.showBarcodeInvalid(barcode);
      return;
    }

    if (scanData.type === 'frame' || scanData.type === 'lineitem' || scanData.type === 'SU' || scanData.type === 'screen') {
      this.backEndService.writeLog('DeliveryOrder', scanData, false);

      for (let item of this.workorder) {
        if (item.barcode === scanData.barcode) {
          // prevent double scan from undelivering, can still do it manually with tap
          if (item.status < 1300) {
            this.notificationService.showItemNotLoaded(item);
          } else if (item.status < 1400) {
            this.onItemClick(item);
            this.notificationService.showItemUpdated(item.ordernumber, item.boxnumber, item.linenumber, 'delivered');
          } else {
            this.notificationService.showItemAlreadyUpdated(item.ordernumber, item.boxnumber, item.linenumber, 'delivered');
          }

          this.scrollTo.next(item.barcode);
          return;
        }
      }

      this.notificationService.showItemNotFound(scanData.barcode);
    } else if (scanData.type === 'workorder') {
      if (scanData.barcode === this.orderNumber) {
        return;
      }

      this.navCtrl.pop().then(fulfilled => {
        if (fulfilled) {
          this.navCtrl.push(DeliveryOrder, {scanData});
        }
      });
    } else {
      this.backEndService.writeLog('DeliveryOrder', scanData, true);
      this.notificationService.showBarcodeInvalidOperation(barcode, scanData.type);
    }
  }

  public onCheckAllClick() {
    this.isCheckAllUsed = true;
    this.workorder.filter(item => this.isDeliverable(item)).forEach(item => this.onItemClick(item));
  }

  public onItemClick(item: PickListItem) {
    console.log('item clicked', item);
    if (this.isDeliverable(item)) {
      console.log('is deliverable: updating status');
      // item is loaded: allow scan/tap
      item.status = 1400;
      item.what = 'status';
      item.scantime = new Date(),
      this.total.completed++;
    } else if (item.what) {
      console.log('not deliverable: already updated or delivered')
      // find item in backup
      const original = this.backup.find((candidate: PickListItem) => {
        return candidate.barcode === item.barcode;
      });

      // give item's status its original value
      item.status = original.status;
      delete item.scantime;
      delete item.what;
      this.total.completed--;
    } else {
      console.log('not deliverable: backordered?');
    }
  }

  public onNextClick() {
    if (this.isNextClicked) {
      return;
    }

    this.isNextClicked = true;

    const items: PickListItem[] = this.workorder.filter(item => item.hasOwnProperty('what'));
    const params = { orderNumber: this.orderNumber, items, isCheckAllUsed: this.isCheckAllUsed, isDeliverRack: this.isDeliverRack };

    if (items.length === 0 && this.appSettings.getDivisionId() === Divisions.ID_ALUMINUM) {
      this.alertCtrl
        .create({ title: 'Not Items Scanned', message: 'There are no items scanned for this delivery' })
        .addButton('Cancel')
        .present()
        .then(() => this.isNextClicked = false);
    } else if (items.length === 0) {
      this.alertCtrl
        .create({ title: 'Warning', message: 'There are no items scanned for this delivery' })
        .addInput({
          type: 'radio',
          label: 'Mistake',
          value: 'mistake',
          checked: true
        })
        .addInput({
          type: 'radio',
          label: 'Site not safe',
          value: 'unsafe',
          checked: false
        })
        .addButton('Cancel')
        .addButton({
          text: 'Ok',
          handler: data => {
            if (data === 'unsafe') {
              this.navCtrl.push(DeliveryConfirmationPage, params);
            }
          }
        })
        .present()
        .then(() => this.isNextClicked = false);
    } else {
      this.navCtrl.push(DeliveryConfirmationPage, params);
    }
  }

  private isDeliverable(item: PickListItem): boolean {
    return !item.what && item.status >= 1300 && item.status !== 1400 && item.productcode != 'S';
  }

  private loadWorkOrder(orderNumber: string, itemNumber?: string) {
    this.orderNumber = orderNumber;
    this.workorder = [];
    this.backup = [];
    this.total = { items: 0, completed: 0 };

    this.subscriptions.push(this.backEndService.getHeader(orderNumber).subscribe(productionHeader => {
      this.productionHeader = productionHeader;
    }));

    this.subscriptions.push(this.backEndService.getItemsByOrderNumber(orderNumber).subscribe(items => {
      for (let item of items) {
        this.workorder.push(PickListItem.clone(item));
        this.total.items++;
        if (item.status === 1400) {
          this.total.completed++;
        }
      }
    }, error => {
      console.log(error);
    }, () => {
      if (itemNumber) {
        const isFrame = parseInt(itemNumber, 10) > 100;
        for (let item of this.workorder) {
          this.backup.push(PickListItem.clone(item));

          if ((isFrame && item.boxnumber === itemNumber) || (!isFrame && item.linenumber === itemNumber)) {
            if (!this.isItemLoaded(item)) {
              this.notificationService.showItemNotLoaded(item);
            } else if (item.status !== 1400) {
              item.what = 'status';
              item.status = 1400;
              item.lastupdate = new Date(),
              this.total.completed++;
              this.notificationService.showItemUpdated(item.ordernumber, item.boxnumber, item.linenumber, 'delivered');
            } else {
              this.notificationService.showItemAlreadyUpdated(item.ordernumber, item.boxnumber, item.linenumber, 'delivered');
            }

            this.scrollTo.next(item.barcode);
            break;
          }
        }
      } else {
        for (let item of this.workorder) {
          this.backup.push(PickListItem.clone(item));
        }
      }

      this.hasData = this.workorder.length > 0;
      this.isLoading = false;
    }));
  }

  private scrollToElement(id: string) {
    if (!id) return;

    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        this.content.scrollTo(0, rect.top - rect.height - 20, 300);
      }
    }, 400);
  }
}
