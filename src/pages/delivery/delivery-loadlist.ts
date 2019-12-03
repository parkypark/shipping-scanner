import { Component, ViewChild } from '@angular/core';
import { AlertController, Content, Events, NavController, NavParams } from 'ionic-angular';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subscription } from 'rxjs/Subscription';

import { DeliveryConfirmationPage } from './delivery-confirmation';
import { DeliveryOrder } from './delivery-order';
import { PickListItem } from '../../models/picklist-item';
import { BackEndService } from '../../services/backend.service';
import { BarcodeService, IScanData } from '../../services/barcode.service';
import { NotificationService } from '../../services/notification.service';
import { ScannerService } from '../../services/scanner.service';

@Component({
  selector: 'page-delivery-loadlist',
  templateUrl: 'delivery-loadlist.html'
})
export class DeliveryLoadListPage {
  public hasData: boolean = false;
  public isLoading: boolean = true;
  public input: { barcode: string } = { barcode: null };
  public loadListId: number;
  public loadList: {[orderNumber: string]: PickListItem[]};
  public orderNumbers: string[];
  public total: {
    items: number,
    completed: number,
    byOrder: {[orderNumber: string]: {items: number, completed: number}}
  };

  @ViewChild(Content) content: Content;

  private backup: Map<string, PickListItem[]>;
  private scrollTo: BehaviorSubject<string> = new BehaviorSubject(null);
  private subscriptions: Subscription[] = [];
  private isNextClicked: boolean = false;

  constructor(
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private navParams: NavParams,
    private backEndService: BackEndService,
    private barcodeService: BarcodeService,
    private notificationService: NotificationService,
    private scannerService: ScannerService
  ) { }

  getCompletion(orderNumber?: string): string {
    if (! this.hasData) {
      return null;
    }

    if (!orderNumber) {
      return `${this.total.completed} / ${this.total.items}`;
    }
    return `${this.total.byOrder[orderNumber].completed} / ${this.total.byOrder[orderNumber].items}`;
  }

  ionViewCanLeave(): Promise<{}> {
    return new Promise((resolve, reject) => {
      if (this.isNextClicked) {
        return resolve();
      }

      let hasScanned = false;
      for (let orderNumber of this.orderNumbers) {
        const workorder = this.loadList[orderNumber];
        for (let item of workorder) {
          if (item.what) {
            hasScanned = true;
            break;
          }
        }
        if (hasScanned) {
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
    this.subscriptions.push(this.scrollTo.subscribe(value => this.scrollToElement(value)));
    this.scannerService.onScan = barcode => this.onBarcodeEntered(barcode);
    this.isNextClicked = false;

    const scanData = this.navParams.get('scanData');
    this.loadLoadList(parseInt(scanData.barcode, 10));
  }

  ionViewDidLeave() {
    for (let subscription of this.subscriptions) {
      if (!subscription.closed) {
        subscription.unsubscribe();
      }
    }
  }

  public isItemLoaded(item: PickListItem) {
    return item.status === 1300 || item.status === 1400;
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
      this.backEndService.writeLog('DeliveryLoadList', scanData, true);
      this.notificationService.showBarcodeInvalid(barcode);
      return;
    }

    if (scanData.type === 'frame' || scanData.type === 'lineitem' || scanData.type === 'SU' || scanData.type === 'screen') {
      this.backEndService.writeLog('DeliveryLoadList', scanData, false);

      for (let orderNumber of this.orderNumbers) {
        for (let item of this.loadList[orderNumber]) {
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
      }

      this.notificationService.showItemNotFound(scanData.barcode);
    } else if (scanData.type === 'picklist') {
      this.navCtrl.pop().then(fulfilled => {
        if (fulfilled) {
          this.navCtrl.push(DeliveryLoadListPage, {scanData});
        }
      });
    } else if (scanData.type === 'workorder') {
      this.navCtrl.pop().then(fulfilled => {
        if (fulfilled) {
          this.navCtrl.push(DeliveryOrder, {scanData});
        }
      });
    } else {
      this.backEndService.writeLog('DeliveryLoadList', scanData, true);
      this.notificationService.showBarcodeInvalidOperation(barcode, scanData.type);
    }
  }

  public onCheckAllClick() {
    this.orderNumbers.forEach(orderNumber => this.loadList[orderNumber]
      .filter(item => this.isDeliverable(item))
      .forEach(item => this.onItemClick(item))
    );
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
      this.total.byOrder[item.ordernumber].completed++;
    } else if (item.what) {
      console.log('not deliverable: already updated or delivered')
      // find item in backup
      const original = this.backup.get(item.ordernumber).find((candidate: PickListItem) => {
        return candidate.barcode === item.barcode;
      });

      // give item's status its original value
      item.status = original.status;
      delete item.scantime;
      delete item.what;
      this.total.completed--;
      this.total.byOrder[item.ordernumber].completed--;
    } else {
      console.log('not deliverable: backordered?');
    }
  }

  public onNextClick() {
    if (this.isNextClicked) {
      return;
    }

    this.isNextClicked = true;
    const items: PickListItem[] = [];
    this.orderNumbers.forEach(orderNumber => this.loadList[orderNumber].filter(item => item.hasOwnProperty('what')).forEach(item => items.push(item)));
    this.navCtrl.push(DeliveryConfirmationPage, { orderNumber: this.orderNumbers.join(', '), items });
  }

  private isDeliverable(item: PickListItem): boolean {
    return !item.what && item.status >= 1300 && item.status !== 1400;
  }

  private loadLoadList(loadListId: number) {
    this.loadListId = loadListId;
    this.backup = new Map<string, PickListItem[]>();
    this.total = { items: 0, completed: 0, byOrder: {} };
    this.loadList = {};
    this.orderNumbers = [];

    this.backEndService.getLoadListItemsGroupedByOrder(loadListId).subscribe(loadList => {
      const iterator = loadList.keys();
      let result: IteratorResult<string>;

      while (result = iterator.next(), !result.done) {
        this.orderNumbers.push(result.value);
        this.loadList[result.value] = [];
        this.backup.set(result.value, []);
        this.total.byOrder[result.value] = { items: 0, completed: 0 };

        const items = loadList.get(result.value);
        for (let item of items) {
          this.loadList[result.value].push(PickListItem.clone(item));
          this.backup.get(result.value).push(PickListItem.clone(item));

          this.total.items++;
          this.total.byOrder[result.value].items++;
          if (item.status === 1400) {
            this.total.completed++;
            this.total.byOrder[result.value].completed++;
          }
        }
      }
    }, error => {
      console.log(error);
    }, () => {
      this.hasData = this.total.items > 0;
      this.isLoading = false;
    });
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
