import { Injectable } from '@angular/core';
import { AppConstants } from '../app/app.constants';
import { AppSettingsService, Divisions } from './app-settings.service';

export interface IScanData {
  barcode: string;
  stamp: Date;
  type: string;
  valid: boolean;
}

@Injectable()
export class BarcodeService {
  public scanData: IScanData;

  constructor(private AppSettingsService: AppSettingsService) { }

  public parseBarcode(barcode: string) {
    const scanData: IScanData = {
      barcode: barcode,
      stamp: new Date(),
      type: null,
      valid: false
    };

    const invalid = (): IScanData => {
      scanData.type = 'invalid';
      scanData.valid = false;
      return scanData;
    };

    const valid = (type: string): IScanData => {
      scanData.type = type;
      scanData.valid = true;
      return scanData;
    };

    if (scanData.barcode && scanData.barcode.length > 0) {
      if (AppConstants.DEBUG_MODE) {
        if (scanData.barcode === 'B') {
          scanData.barcode = 'B001';
          return valid('bay');
        }

        if (this.AppSettingsService.get('division') === Divisions.ALUMINUM) {
          if (scanData.barcode === 'F') {
            scanData.barcode = 'X155494158V';
            return valid('frame');
          }
          if (scanData.barcode === 'M') {
            scanData.barcode = 'M123456001V';
            return valid('lineitem');
          }
          if (scanData.barcode === 'X') {
            scanData.barcode = '18515';
            return valid('picklist');
          }
        } else {
          if (scanData.barcode === 'F') {
            scanData.barcode = 'X341090404V';
            return valid('frame');
          }
          if (scanData.barcode === 'M') {
            scanData.barcode = 'M341640002V';
            return valid('lineitem');;
          }
          if (scanData.barcode === 'X') {
            scanData.barcode = '6660';
            return valid('picklist');
          }
        }

        if (scanData.barcode === 'Z') {
          scanData.barcode = 'X1234V';
          return valid('rack');
        }

        if (scanData.barcode === 'O') {
          scanData.barcode = '162525';
          return valid('workorder');
        }
      }

      if (scanData.barcode[0] === 'B') {
        if (this.isNumeric(scanData.barcode.slice(1))) {
          return valid('bay');
        }
      } else if (scanData.barcode[0] === 'M') {
        if (scanData.barcode.length > 6) {
          return valid('lineitem');
        }
      } else if (scanData.barcode[0] === 'X') {
        if (scanData.barcode.length > 6) {
          return valid('frame');
        }
        if (scanData.barcode.length > 1) {
          return valid('rack');
        }
        return invalid();
      } else if (scanData.barcode.indexOf('`') !== -1) {
        return valid('SU');
      } else if (scanData.barcode.indexOf('SCR') !== -1) {
        return valid('screen');
      } else {
        if (this.isNumeric(scanData.barcode) && parseInt(scanData.barcode, 10) > 0) {
          if (scanData.barcode.length >= 6) {
            return valid('workorder');
          }
          if (scanData.barcode.length >= 4) {
            return valid('picklist');
          }
          return invalid();
        }

        return invalid();
      }
    } else {
      scanData.type = 'empty';
      scanData.valid = false;
    }

    return scanData;
  }

  private isNumeric(value: string) {
    return /^\d+$/.test(value);
  }
}
