import { ChangeDetectorRef, Component, Inject, forwardRef } from '@angular/core';
import { LoadingController, ViewController } from 'ionic-angular';

import { AppSettingsService, Divisions } from '../services/app-settings.service';
import { BackEndService } from '../services/backend.service';
import { NotificationService } from '../services/notification.service';
import { ScannerService } from '../services/scanner.service';

@Component({
  selector: 'modal-authenticate',
  template: `
    <ion-content padding>
      <div style="text-align:center">
        <h1 style="font-size:48px"><ion-icon name="unlock"></ion-icon></h1>
        <p>Scan your employee card to sign in</p>
      </div>
      <form (ngSubmit)="onBarcodeEntered(input.barcode)">
        <ion-list>
          <ion-item>
            <ion-label fixed>Employee ID</ion-label>
            <ion-input name="barcode" [value]="employeeId" (input)="onBarcodeEntered($event.target.value)" [clearInput]="true"></ion-input>
          </ion-item>
        </ion-list>
        <button type="submit" (click)="accept()" [disabled]="!isValid()" block ion-button>Accept</button>
      </form>
    </ion-content>
  `
})
export class AuthenticationComponent {
  public employeeId: string = '';
  public input: { barcode: string } = { barcode: null };
  private canLeave: boolean = false;
  private backend: BackEndService;
  private validating: boolean = false;

  constructor(
    private ref: ChangeDetectorRef,
    private viewCtrl: ViewController,
    private appSettings: AppSettingsService,
    private loadingCtrl: LoadingController,
    private notification: NotificationService,
    private scannerService: ScannerService,
    @Inject(forwardRef(() => BackEndService)) backend
  ) {
    this.backend = backend;
  }

  ionViewDidEnter() {
    this.canLeave = false;
    this.scannerService.onScan = barcode => this.onBarcodeEntered(barcode);
  }

  ionViewCanLeave() {
    return this.canLeave;
  }

  public accept() {
    if (!this.employeeId || this.employeeId.length < 5) {
      return;
    }

    if (this.employeeId[0] === 'X') {
      // special barcodes for branch office use
      console.log('Determined division from employee id to be Vinyl');
      this.appSettings.set('division', Divisions.VINYL);
    } else {
      const divisionId = parseInt(this.employeeId[0], 10);
      if (divisionId === 1) {
        console.log('Determined division from employee id to be Vinyl');
        this.appSettings.set('division', Divisions.VINYL);
      } else if (divisionId === 2) {
        console.log('Determined division from employeeid to be Aluminum');
        this.appSettings.set('division', Divisions.ALUMINUM);
      }
    }

    this.validating = true;
    const loading = this.loadingCtrl.create({content: 'Please wait...'});
    loading.present();

    console.log('validating employee id:', this.employeeId);
    this.backend.getEmployee(this.employeeId.substr(1)).subscribe(employee => {
      this.validating = false;
      loading.dismiss();

      if (employee) {
        this.canLeave = true;
        this.viewCtrl.dismiss(employee);
      } else {
        this.notification.showEmployeeNotFound(this.employeeId);
      }
    });
  }

  public isValid() {
    return this.employeeId && this.employeeId.length >= 5 && !this.validating;
  }

  public onBarcodeEntered(barcode: string) {
    if (barcode && barcode.length > 0) {
      this.employeeId = barcode;
    }
    this.ref.detectChanges();
  }

  public onEmployeeIdChanged(employeeId: string) {
    this.employeeId = employeeId;
  }
}
