import { Component, ViewChild } from '@angular/core';
import { AlertController, Content, NavController, NavParams } from 'ionic-angular';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subscription } from 'rxjs/Subscription';

import { BackEndService } from '../../services/backend.service';
import { BarcodeService, IScanData } from '../../services/barcode.service';
import { NotificationService } from '../../services/notification.service';
import { PickListItem } from '../../models/picklist-item';
import { RackData } from '../../models/rack-data';
import { ScannerService } from '../../services/scanner.service';

@Component({
  selector: 'page-loading-picklist',
  templateUrl: 'loading-picklist.html'
})
export class LoadingPickList {
  public loadedRacks: string[];
  public pickListId: number;
  public pickList: RackData[];
  public hasData: boolean = false;
  public isLoading: boolean = true;
  public input: { barcode: string } = { barcode: null };
  public tapEnabled: boolean = false;

  @ViewChild(Content) content: Content;

  private backup: RackData[];
  private scrollTo: BehaviorSubject<string> = new BehaviorSubject(null);
  private subscriptions: Subscription[] = [];
  private total: {
    items: number,
    completed: number,
    racks: {
      [racknumber: string]: {
        items: number,
        completed: number
      }
    }
  };

  constructor(
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private navParams: NavParams,
    private backEndService: BackEndService,
    private barcodeService: BarcodeService,
    private notificationService: NotificationService,
    private scannerService: ScannerService
  ) {
    this.total = { items: 0, completed: 0, racks: {} };
    this.loadedRacks = [];
  }

  getCompletion(racknumber?: string) {
    if (! this.hasData) {
      return null;
    }

    if (racknumber) {
      if (this.total.racks.hasOwnProperty(racknumber)) {
        return `${this.total.racks[racknumber].completed} / ${this.total.racks[racknumber].items}`;
      }
      return null;
    }

    return `${this.total.completed} / ${this.total.items}`;
  }

  ionViewCanLeave(): Promise<{}> {
    return new Promise((resolve, reject) => {
      if (! this.isSaveEnabled()) {
        return resolve();
      }

      this.alertCtrl.create({
        title: 'Leave Page?',
        message: 'There are unsaved changes to this pick list',
        buttons: [
          { text: 'Yes', handler: () => resolve(), },
          { text: 'No', handler: () => reject() }
        ],
      }).present();
    });
  }

  ionViewDidEnter() {
    const scanData = this.navParams.get('scanData');
    if (scanData.type === 'picklist') {
      this.loadPickList(parseInt(scanData.barcode, 10));
    } else if (scanData.type === 'frame' || scanData.type === 'lineitem') {
      const orderNumber = scanData.barcode.slice(1, 7);
      const itemNumber = scanData.barcode.slice(7, 10);
      this.loadPickListFromItem(orderNumber, itemNumber);
    }

    this.loadedRacks = [];
    this.subscriptions.push(this.scrollTo.subscribe(value => this.scrollToElement(value)));
    this.scannerService.onScan = barcode => this.onBarcodeEntered(barcode);
  }

  ionViewDidLeave() {
    for (let subscription of this.subscriptions) {
      if (!subscription.closed) {
        subscription.unsubscribe();
      }
    }
  }

  public isSaveEnabled() {
    if (this.isLoading || !this.hasData) return false;

    if (this.loadedRacks.length > 0) {
      return true;
    }

    for (let rack of this.pickList) {
      for (let backupRack of this.backup) {
        if (backupRack.racknumber === rack.racknumber) {
          if (!RackData.equals(rack, backupRack)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  public onBarcodeEntered(barcode: string) {
    const scanData: IScanData = this.barcodeService.parseBarcode(barcode);
    if (!scanData.valid) {
      this.backEndService.writeLog('LoadingPickList', scanData, true);
      this.notificationService.showBarcodeInvalid(barcode);
      return;
    }

    if (scanData.type === 'frame' || scanData.type === 'lineitem' || scanData.type === 'screen' || scanData.type === 'SU') {
      this.backEndService.writeLog('LoadingPickList', scanData, false);

      for (let rack of this.pickList) {
        for (let item of rack.data) {
          if (item.barcode === scanData.barcode) {
            this.scrollToElement(item.barcode);

            if (item.status !== 1400) {
              this.onItemClick(item, true);
              this.notificationService.showItemUpdated(item.ordernumber, item.boxnumber, item.linenumber, 'loaded');
            } else {
              this.notificationService.showItemAlreadyUpdated(item.ordernumber, item.boxnumber, item.linenumber, 'loaded');
            }
            return;
          }
        }
      }

      this.notificationService.showItemNotFound(scanData.barcode);
    } else if (scanData.type === 'picklist') {
      if (parseInt(scanData.barcode, 10) === this.pickListId) {
        return;
      }
      this.navCtrl.pop().then(fulfilled => {
        if (fulfilled) {
          this.navCtrl.push(LoadingPickList, {scanData});
        }
      });
    } else {
      this.backEndService.writeLog('LoadingPickList', scanData, true);
      this.notificationService.showBarcodeInvalidOperation(barcode, scanData.type);
    }
  }

  public onItemClick(item: PickListItem, force?: boolean) {
    if (!(this.tapEnabled || force)) {
      return;
    }

    if (item.status === 1400 && item.productcode !== 'R') {
      // don't update shipped to loaded -- that's for unloading process
      return;
    }

    if (item.productcode === 'S') {
      // item is on hold
      return;
    }

    if (item.status !== 1300) {
      item.status = 1300;
      item.what = 'status';
      item.scantime = new Date(),
      this.total.completed++;
      this.total.racks[item.racknumber].completed++;
    } else if (item.what) {
      // find item in backup
      const rack = this.backup.find(candidate => {
        return candidate.racknumber === item.racknumber;
      });

      const original = rack.data.find(candidate => {
        return candidate.barcode === item.barcode;
      });

      // give item's status the original value
      item.status = original.status;
      delete item.scantime;
      delete item.what;
      this.total.completed--;
      this.total.racks[item.racknumber].completed--;
    }
  }

  public onSaveClick() {
    const items: PickListItem[] = [];
    for (let rack of this.pickList) {
      for (let item of rack.data) {
        if (item.what === 'status') {
          items.push(item);
        }
      }
    }

    if (items.length > 0) {
      this.subscriptions.push(this.backEndService.updateItems(items).subscribe(result => {
        if (result) {
          this.backup = [];
          for (let rack of this.pickList) {
            for (let item of rack.data) {
              if (item.hasOwnProperty('what')) {
                delete item.what;
              }
            }
            this.backup.push(RackData.clone(rack));
          }
          this.notificationService.showItemsUpdated(items.length);
          // Raj requested the app to stay with the picklist after saving
          // this.navCtrl.pop();
        } else {
          this.notificationService.showItemsNotUpdated();
        }
      }));
    }
  }

  private loadPickList(pickListId: number, scanNow?: PickListItem) {
    this.isLoading = true;
    this.pickListId = pickListId;
    this.pickList = [];
    this.backup = [];
    this.total = { items: 0, completed: 0, racks: {} };

    if (pickListId < 1) {
      this.notificationService.showPickListInvalid();
      this.isLoading = false;
      return;
    }

    this.subscriptions.push(this.backEndService.getPickListItemsGroupedByRack(pickListId).subscribe(rackData => {
      for (let rack of rackData) {
        this.pickList.push(RackData.clone(rack));
      }
    }, error => {
      console.log(error);
    }, () => {
      for (let rack of this.pickList) {
        this.backup.push(RackData.clone(rack));

        // compute totals
        this.total.racks[rack.racknumber] = { items: 0, completed: 0};
        for (let item of rack.data) {
          this.total.items++;
          this.total.racks[rack.racknumber].items++;

          if (item.status >= 1300 && item.status < 1500) {
            this.total.completed++;
            this.total.racks[rack.racknumber].completed++;
          }

          // if an item was used to load the pick list, load it now
          if (scanNow && item.barcode === scanNow.barcode) {
            if (item.status < 1300 || item.status === 1600 || item.status === 1601) {
              this.onItemClick(item, true);
              this.notificationService.showItemUpdated(item.ordernumber, item.boxnumber, item.linenumber,  'loaded');
            } else {
              this.notificationService.showItemAlreadyUpdated(item.ordernumber, item.boxnumber, item.linenumber,  'loaded');
            }

            this.scrollTo.next(item.barcode);
          }
        }
      }

      this.hasData = this.pickList.length > 0;
      this.isLoading = false;
    }));
  }

  private loadPickListFromItem(orderNumber: string, itemNumber: string) {
    this.subscriptions.push(this.backEndService.getItem(orderNumber, itemNumber).subscribe(
      (item: PickListItem) => {
        if (item) {
         this.loadPickList(item.picklistid, item);
        } else {
          this.hasData = false;
          this.isLoading = false;
        }
      },
      error => {
        console.log(error);
      }
    ));
  }

  private scrollToElement(id: string) {
    if (!id) return;

    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        this.content.scrollTo(0, rect.top - 100, 200);
      }
    }, 1000);
  }
}
