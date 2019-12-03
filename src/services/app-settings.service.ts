import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

export const Divisions = {
  ID_ALUMINUM: 0,
  ID_VINYL: 1,
  ALUMINUM: 'Aluminum',
  VINYL: 'Vinyl'
};

@Injectable()
export class AppSettingsService {
  private settings: Map<string, any>;
  private readyPromise: Promise<void>;

  constructor(private storage: Storage) {
    this.settings = new Map<string, any>();

    this.readyPromise = new Promise((resolve, reject) => {
      this.storage.ready().then(() => {
        this.storage.forEach((value: any, key: string) => {
          if (key.indexOf('as_') !== -1) {
            this.settings.set(key, value);
          }
        }).then(() => {
          if (!this.settings.has('as_division')) {
            this.set('division', Divisions.ALUMINUM);
          }
          resolve();
        });
      });
    });
  }

  ready(): Promise<void> {
    return this.readyPromise;
  }

  // generic
  get(settingName: string): any {
    return this.settings.get(`as_${settingName}`);
  }

  set(settingName: string, value: any) {
    this.storage.set(`as_${settingName}`, value);
    this.settings.set(`as_${settingName}`, value);
  }

  getDivision(): string {
    return this.get('division');
  }

  // division
  getDivisionId(): number {
    return this.get('division') === Divisions.ALUMINUM
      ? Divisions.ID_ALUMINUM
      : Divisions.ID_VINYL;
  }
}
