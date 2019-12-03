import { Injectable } from '@angular/core';
import { Platform } from 'ionic-angular';

interface IMyWindow extends Window {
  plugins: any;
}
declare var window: IMyWindow;

@Injectable()
export class ScannerService {
  constructor(platform: Platform) {
    platform.ready().then(() => {
      platform.pause.subscribe(() => {
        this.onPause();
      });

      platform.resume.subscribe(() => {
        this.onResume();
      });

      this.onResume();
    });
  }

  public onScan(barcode: string) {
    console.log('ScannerService.onScan(): override this in components!');
  }

  private onPause() {
    if (window.plugins && window.plugins.intentShim) {
      window.plugins.intentShim.unregisterBroadcastReceiver();
    }
  }

  private onResume() {
    if (window.plugins && window.plugins.intentShim) {
      window.plugins.intentShim.registerBroadcastReceiver({
        filterActions: ['com.starlinewindows.shippingscanner.ACTION']
      }, intent => {
        const keys = Object.keys(intent.extras);

        let barcode: string;
        if (keys.indexOf('com.symbol.datawedge.data_string') > -1) {
          barcode = intent.extras['com.symbol.datawedge.data_string'];
        } else if (keys.indexOf('com.motorolasolutions.emdk.datawedge.data_string') > -1) {
          barcode = intent.extras['com.motorolasolutions.emdk.datawedge.data_string'];
        }

        console.log('ScannerService: barcode scanned:', barcode);
        this.onScan(barcode.trim().toUpperCase());
      });
    }
  }
}
