import { Component, ChangeDetectorRef } from '@angular/core';
import { LoadingController, ModalController, NavController, NavParams } from 'ionic-angular';
import { Camera, CameraOptions } from '@ionic-native/camera';
import { Coordinates, Geolocation, GeolocationOptions } from '@ionic-native/geolocation';
import { BackEndService } from '../../services/backend.service';
import { BarcodeService, IScanData } from '../../services/barcode.service';
import { Branches } from '../../models/branchMeta';
import { DeliveryOrder } from './delivery-order';
import { Header } from '../../models/header';
import { NetworkMonitorService } from '../../services/network-monitor.service';
import { NotificationService } from '../../services/notification.service';
import { ScannerService } from '../../services/scanner.service';
import { PickListItem } from '../../models/picklist-item';
import { SignaturePadModal } from '../../components/signature-pad';

import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { forkJoin } from 'rxjs/observable/forkJoin';

@Component({
  selector: 'page-delivery-confirmation',
  templateUrl: 'delivery-confirmation.html'
})
export class DeliveryConfirmationPage {
  public attachedPhotos: string[] = [];
  public comments: string;
  public coordinates: Coordinates;
  public customerEmails: string[];
  public customerEmail: string;
  public header: Header;
  public items: PickListItem[] = [];
  public newCustomerEmail: string;
  public orderNumber: string;
  public receiverName: string;
  public signature: string;
  public totalItems: number;
  public useHWCamera: boolean = true;

  private isCheckAllUsed: boolean = false;
  private isDeliverRack: boolean = false;

  constructor(
    private loadingCtrl: LoadingController,
    private modalCtrl: ModalController,
    private navCtrl: NavController,
    private backEndService: BackEndService,
    private notificationService: NotificationService,
    private scannerService: ScannerService,
    private camera: Camera,
    private geolocation: Geolocation,
    private ref: ChangeDetectorRef,
    private navParams: NavParams
  ) { }

  getCoordinates() {
    if (!this.coordinates) {
      return 'N/A';
    }

    const lat = Math.round(this.coordinates.latitude * 100) / 100;
    const lon = Math.round(this.coordinates.longitude * 100) / 100;
    return `Lat: ${lat}, Lon: ${lon}`;
  }

  ionViewDidEnter() {
    // collect info from parameters
    this.isCheckAllUsed = this.navParams.get('isCheckAllUsed');
    this.isDeliverRack = this.navParams.get('isDeliverRack');
    this.items = this.navParams.get('items');
    this.orderNumber = this.navParams.get('orderNumber');

    // initialize
    const orderNumbers = this.orderNumber.split(', ');
    this.attachedPhotos = [];
    this.signature = null;
    this.totalItems = 0;

    // pre-set comment for unsafe delivery
    if (!this.items || this.items.length < 1) {
      this.comments = 'Site not safe for delivery';
    }

    // disable the scanner for this page
    this.scannerService.onScan = barcode => {
      console.log('delivery-confirmation - barcode scanned:', barcode);
    };

    // get delivery location
    try {
      this.geolocation.getCurrentPosition({maximumAge: 600000, timeout: 10000, enableHighAccuracy: true}).then(resp => {
        console.log('GPS coordinates:', resp.coords);
        this.coordinates = resp.coords;
      }).catch(error => {
        this.geolocation.getCurrentPosition({maximumAge: 600000, timeout: 10000, enableHighAccuracy: false}).then(resp => {
          console.log('GPS coordinates:', resp.coords);
          this.coordinates = resp.coords;
        }).catch(error => {
          console.log('Error getting location', error);
          this.coordinates = null;
        });
      });
    } catch(error) {
      console.log('Error getting location', error);
      this.coordinates = null;
    }

    // compile email list
    const emailAddresses = new Set<string>();
    const observables: Observable<Header>[] = [];

    orderNumbers.forEach(orderNumber => observables.push(this.backEndService.getHeader(orderNumber)));
    forkJoin(observables).subscribe(results => {
      for (let header of results) {
        this.totalItems += header.totalitems;
        if (header.siteemail && header.siteemail.length > 0 && header.siteemail !== 'NA') {
          const tmpEmailAddresses = header.siteemail.split(',').filter(email => email.length > 0 && email !== 'NA');
          for (const email of tmpEmailAddresses) {
            emailAddresses.add(email);
          }
        }
        if (header.sitecontact && header.sitecontact.length > 0) {
          this.receiverName = header.sitecontact;
        }
        break;
      }

      // apply email addresses
      this.customerEmails = Array.from(emailAddresses).filter(email => email.includes('@'));
      this.customerEmail = this.customerEmails.join(',');
    });
  }

  public isValid() {
    return (this.attachedPhotos && this.attachedPhotos.length > 0) || (this.receiverName && this.signature);
  }

  public onAddCustomerEmail()
  {
    if (this.newCustomerEmail.length >= 3 && this.newCustomerEmail.includes('@') && this.customerEmails.indexOf(this.newCustomerEmail) < 0) {
      this.customerEmails.push(this.newCustomerEmail);
      this.customerEmail = this.customerEmails.join(',');
    }
    this.newCustomerEmail = '';
  }

  public onCompleteClick() {
    const loading = this.loadingCtrl.create({content: 'Please wait...'});
    loading.present();

    const location = this.coordinates ? [this.coordinates.latitude, this.coordinates.longitude] : [-1, -1];

    const observables = [
      this.backEndService.writeProofOfDelivery(
        this.orderNumber,
        this.items,
        this.comments,
        this.customerEmail,
        this.receiverName,
        this.signature,
        location,
        this.attachedPhotos
      )
    ];

    if (this.isCheckAllUsed) {
      observables.push(this.backEndService.writeLogMessage(this.orderNumber, 'CheckAll'));
    }

    if (this.items && this.items.length > 0) {
      if (this.isDeliverRack) {
        const rackNumbers = Array.from(new Set(this.items.map(item => item.racknumber)));
        rackNumbers.forEach(rackNumber => observables.push(this.backEndService.updateShippingBay(rackNumber, this.orderNumber)));
      }
      observables.push(this.backEndService.updateItems(this.items, 'Delivered'));
    }

    forkJoin(observables).subscribe(results => {
      if (results.every(res => res)) {
        this.notificationService.showItemsUpdated(this.items.length);
        this.navCtrl.popTo(this.navCtrl.getByIndex(this.navCtrl.length() - 2)).then(() => loading.dismiss()); // navigate back to deliery page (2 pops)
      } else {
        this.notificationService.showItemsNotUpdated();
        loading.dismiss();
      }
    });
  }

  public onPhotoAttached($event: Event) {
    const target: any = $event.target;
    const reader = new FileReader();
    reader.onload = () => {
      this.attachedPhotos.push(reader.result);
      this.ref.detectChanges();
    }
    reader.readAsDataURL(target.files[0]);
  }

  public onRemoveCustomerEmail(index: number)
  {
    this.customerEmails.splice(index, 1);
    this.customerEmail = this.customerEmails.join(',');
  }

  public onTakePhoto() {
    const options: CameraOptions = {
      quality: 100,
      destinationType: this.camera.DestinationType.DATA_URL,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE,
      targetHeight: 360,
      targetWidth: 640
    };

    this.camera.getPicture(options).then(imageData => {
      this.attachedPhotos.push('data:image/jpeg;base64,' + imageData);
      this.ref.detectChanges();
    }, err => {
      console.error(err);
    });
  }

  public onTakeSignature() {
    const modal = this.modalCtrl.create(SignaturePadModal);
    modal.onDidDismiss(result => {
      if (result && result.signature) {
        this.signature = result.signature;
      }
    });
    modal.present();
  }

  public onPhotoRemoved(index: number) {
    this.attachedPhotos.splice(index, 1);
  }
}
