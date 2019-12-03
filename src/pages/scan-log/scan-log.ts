import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { ILogEntry, ScanLogService } from '../../services/scanlog.service';

@Component({
  selector: 'page-scan-log',
  templateUrl: 'scan-log.html'
})
export class ScanLogPage {
  public log: ILogEntry[];

  constructor(
    private navCtrl: NavController,
    private scanLogService: ScanLogService
  ) {
    this.log = scanLogService.get();
  }

  clear() {
    this.scanLogService.clear();
    this.log = [];
  }

  close() {
    this.navCtrl.pop();
  }
}
