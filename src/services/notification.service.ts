import { Injectable } from '@angular/core';
import { Vibration } from '@ionic-native/vibration';
import { ToastController } from 'ionic-angular';
import { IPicklistItem } from '../models/picklist-item';

const DURATION_SHORT = 3000;
const DURATION_MEDIUM = 5000;
const DURATION_LONG = 30000;
const TOAST_TEMPLATE = { showCloseButton: true, closeButtonText: '✖' };

@Injectable()
export class NotificationService {
  constructor(private toastCtrl: ToastController, private vibration: Vibration) { }

  public showBarcodeInvalid(barcode: string) {
    this.toastCtrl.create(Object.assign({
      message: `Scanned barcode (${barcode}) is not recognized`,
      duration: DURATION_LONG,
      cssClass: 'warning'
    }, TOAST_TEMPLATE)).present();

    this.vibration.vibrate(1000);
  }

  public showBarcodeInvalidOperation(barcode: string, barcodeType: string) {
    this.toastCtrl.create(Object.assign({
      message: `Scanned barcode (${barcode}) is a ${barcodeType} and is not valid for this operation`,
      duration: DURATION_MEDIUM,
      cssClass: 'warning'
    }, TOAST_TEMPLATE)).present();

    this.vibration.vibrate(1000);
  }

  public showEmployeeNotFound(employeeId: string) {
    this.toastCtrl.create(Object.assign({
      message: `Employee not found for id: ${employeeId}`,
      duration: DURATION_MEDIUM,
      cssClass: 'warning'
    }, TOAST_TEMPLATE)).present();

    this.vibration.vibrate(1000);
  }

  public showItemUpdated(orderNumber: string, frameNumber: string, lineNumber: string, subject: string) {
    let what: string;
    let itemNumber: string;
    if (parseInt(frameNumber, 10) > 100) {
      what = 'Frame';
      itemNumber = frameNumber;
    } else {
      what = 'Line';
      itemNumber = lineNumber;
    }

    this.toastCtrl.create(Object.assign({
      message: `Order #${orderNumber} - ${what} #${itemNumber}: ${subject}`,
      duration: DURATION_SHORT,
      cssClass: 'success'
    }, TOAST_TEMPLATE)).present();
  }

  public showItemAlreadyScanned(barcode: string) {
    this.toastCtrl.create(Object.assign({
      message: `Item with barcode: ${barcode} was already scanned`,
      duration: DURATION_MEDIUM,
      cssClass: 'warning'
    }, TOAST_TEMPLATE)).present();

    this.vibration.vibrate(1000);
  }

  public showItemAlreadyUpdated(orderNumber: string, frameNumber: string, lineNumber: string, subject: string) {
    let what: string;
    let itemNumber: string;
    if (parseInt(frameNumber, 10) > 100) {
      what = 'Frame';
      itemNumber = frameNumber;
    } else {
      what = 'Line';
      itemNumber = lineNumber;
    }

    this.toastCtrl.create(Object.assign({
      message: `Order #${orderNumber} - ${what} #${itemNumber}: already ${subject}`,
      duration: DURATION_MEDIUM,
      cssClass: 'warning'
    }, TOAST_TEMPLATE)).present();

    this.vibration.vibrate(1000);
  }

  public showItemNotFound(barcode: string) {
    this.toastCtrl.create(Object.assign({
      message: `Item not found for barcode: ${barcode}`,
      duration: DURATION_MEDIUM,
      cssClass: 'warning'
    }, TOAST_TEMPLATE)).present();

    this.vibration.vibrate(1000);
  }

  public showItemNotLoaded(item: IPicklistItem) {
    const message = parseInt(item.boxnumber, 10) > 100
      ? `Order #${item.ordernumber} - Frame #${item.boxnumber} is not yet loaded`
      : `Order #${item.ordernumber} - Line #${item.linenumber} is not yet loaded`;

    this.toastCtrl.create(Object.assign({
      message,
      duration: DURATION_MEDIUM,
      cssClass: 'warning'
    }, TOAST_TEMPLATE)).present();

    this.vibration.vibrate(1000);
  }

  public showItemsUpdated(itemCount: number) {
    this.toastCtrl.create(Object.assign({
      message: `Updated ${itemCount} items`,
      duration: DURATION_MEDIUM,
      cssClass: 'success'
    }, TOAST_TEMPLATE)).present();
  }

  public showItemsNotUpdated() {
    this.toastCtrl.create(Object.assign({
      message: 'Items not updated',
      duration: DURATION_LONG,
      cssClass: 'error'
    }, TOAST_TEMPLATE)).present();

    this.vibration.vibrate(2000);
  }

  public showTransferred(sourceSubject: string, source: string, targetSubject: string, target: string) {
    this.toastCtrl.create(Object.assign({
      message: `Transferred ${sourceSubject}${source} to ${targetSubject}${target}`,
      duration: DURATION_SHORT,
      cssClass: 'success'
    }, TOAST_TEMPLATE)).present();
  }

  public showNotTransferred(sourceSubject: string, source: string, targetSubject: string, target: string) {
    this.toastCtrl.create(Object.assign({
      message: `Failed to transfer ${sourceSubject}${source} to ${targetSubject}${target}`,
      duration: DURATION_LONG,
      cssClass: 'error'
    }, TOAST_TEMPLATE)).present();

    this.vibration.vibrate(2000);
  }

  public showPickListInvalid() {
    this.toastCtrl.create(Object.assign({
      message: `Pick list doesn't exist or item not assigned to pick list`,
      duration: DURATION_MEDIUM,
      cssClass: 'warning'
    }, TOAST_TEMPLATE)).present();

    this.vibration.vibrate(1000);
  }

  public showRackCleared(rackNumber: string) {
    this.toastCtrl.create(Object.assign({
      message: `Cleared contents of rack #${rackNumber}`,
      duration: DURATION_SHORT,
      cssClass: 'success'
    }, TOAST_TEMPLATE)).present();
  }

  showReturned(count: number, rackNumber: string) {
    this.toastCtrl.create(Object.assign({
      message: `Returned ${count} items onto rack #${rackNumber}`,
      duration: DURATION_SHORT,
      cssClass: 'success'
    }, TOAST_TEMPLATE)).present();
  }

  showNotReturned() {
    this.toastCtrl.create(Object.assign({
      message: 'Failed to return items',
      duration: DURATION_LONG,
      cssClass: 'error'
    }, TOAST_TEMPLATE)).present();

    this.vibration.vibrate(2000);
  }

  showUnloaded(count: number, rackNumber: string) {
    this.toastCtrl.create(Object.assign({
      message: `Unloaded ${count} items onto rack #${rackNumber}`,
      duration: DURATION_SHORT,
      cssClass: 'success'
    }, TOAST_TEMPLATE)).present();
  }

  showNotUnloaded() {
    this.toastCtrl.create(Object.assign({
      message: 'Failed to unload items',
      duration: DURATION_LONG,
      cssClass: 'error'
    }, TOAST_TEMPLATE)).present();

    this.vibration.vibrate(2000);
  }

  public showOfflineDataSynchronized() {
    this.toastCtrl.create(Object.assign({
      message: `Synchronization complete. Offline updates uploaded`,
      duration: DURATION_SHORT,
      cssClass: 'success'
    }, TOAST_TEMPLATE)).present();
  }

  public showWorkordersDownloaded(count: number) {
    this.toastCtrl.create(Object.assign({
      message: `Downloaded ${count} workorders to offline storage`,
      duration: DURATION_SHORT,
      cssClass: 'success'
    }, TOAST_TEMPLATE)).present();
  }

  public showWorkordersNotDownloaded() {
    this.toastCtrl.create(Object.assign({
      message: 'Failed to download workorders to offline storage',
      duration: DURATION_MEDIUM,
      cssClass: 'error'
    }, TOAST_TEMPLATE)).present();

    this.vibration.vibrate(2000);
  }
}
