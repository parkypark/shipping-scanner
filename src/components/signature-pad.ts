import { Component, HostListener, ViewChild } from '@angular/core';
import { ModalController, NavParams, ViewController } from 'ionic-angular';
import { SignaturePad } from 'angular2-signaturepad/signature-pad';

@Component({
  selector: 'signature-pad-modal',
  template: `
    <ion-header>
      <ion-navbar>
        <ion-title>Signature</ion-title>
        <ion-buttons end>
          <button ion-button (click)="onDismiss()">Close</button>
        </ion-buttons>
      </ion-navbar>
    </ion-header>

    <ion-content>
      <signature-pad [options]="signaturePadOptions"></signature-pad>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-buttons start>
          <button ion-button (click)="onDismiss()">Cancel</button>
          <button ion-button (click)="onClear()">Clear</button>
        </ion-buttons>
        <ion-buttons end>
          <button ion-button (click)="onAccept()">Accept</button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  `
})
export class SignaturePadModal {
  public readonly signaturePadOptions = {
    minWidth: 2,
    canvasWidth: 320,
    canvasHeight: 180,
    backgroundColor: '#fff',
    penColor: '#000'
  };

  @ViewChild(SignaturePad) signaturePad: SignaturePad;

  constructor(
    private viewCtrl: ViewController
  ) {}

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.resizeSignaturePad();
  }

  public ionViewDidEnter() {
    this.resizeSignaturePad();
  }

  public isValid() {
    return !this.signaturePad.isEmpty();
  }

  public onAccept() {
    this.viewCtrl.dismiss({signature: this.signaturePad.toDataURL('image/jpeg')});
  }

  public onClear() {
    this.signaturePad.clear();
  }

  public onDismiss() {
    this.viewCtrl.dismiss();
  }

  public resizeSignaturePad() {
    const canvas = document.querySelector('canvas');
    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    this.signaturePad.set('canvasWidth', canvas.offsetWidth * ratio);
    this.signaturePad.set('canvasHeight', 180 * ratio);
    canvas.getContext('2d').scale(ratio, ratio);
    this.signaturePad.resizeCanvas();
    this.signaturePad.clear();
  }

}
