import { Injectable } from '@angular/core';
import { AppConstants } from '../app/app.constants';
import { AppSettingsService } from './app-settings.service';

export interface ILogEntry {
  status: string;
  target: string;
  description: string;
}

@Injectable()
export class ScanLogService {
  private logEntries: ILogEntry[];

  constructor(
    private appSettingsService: AppSettingsService
  ) {
    this.logEntries = [];

    const savedLog = appSettingsService.get('scanlog');
    if (savedLog && savedLog.length > 0) {
      for (let entry of savedLog) {
        this.logEntries.push(entry);
      }
    }
  }

  clear() {
    this.logEntries = [];
    this.appSettingsService.set('scanlog', this.logEntries);
  }

  get(): ILogEntry[] {
    return this.logEntries;
  }

  log(status: string, target: string, description: string) {
    if (AppConstants.DEBUG_MODE) {
      console.log('ScanLogService@log():', {status, target, description});
    }

    this.logEntries.unshift({status, target, description});

    if (this.logEntries.length > 50) {
      this.logEntries = this.logEntries.slice(0, 49);
    }

    this.appSettingsService.set('scanlog', this.logEntries);
  }

  logHttpError(url: string, error: string) {
    this.log('error', url, error);
  }
}
