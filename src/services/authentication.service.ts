import { Injectable } from '@angular/core';
import { ModalController } from 'ionic-angular';
import { AppConstants } from '../app/app.constants';
import { AppSettingsService } from '../services/app-settings.service';
import { AuthenticationComponent } from '../components/authentication';
import { NetworkMonitorService } from './network-monitor.service';
import { Employee } from '../models/employee';

@Injectable()
export class AuthenticationService {
  public employee: Employee;

  constructor(
    private appSettings: AppSettingsService,
    private modalCtrl: ModalController,
    private networkMonitorService: NetworkMonitorService
  ) {
    this.appSettings.ready().then(() => this.employee = this.getEmployee());
  }

  public getEmployee(): Employee {
    const employee = this.appSettings.get('employee');
    return employee ? Employee.clone(employee) : null;
  }

  public isLoggedIn(): boolean {
    const employee = this.getEmployee();
    if (!employee) {
      return false;
    }

    let expired: boolean = true;
    if (employee.timestamp && employee.employeenumber !== '0') {
      const diff = Date.now() - employee.timestamp;
      const maxAge = 60 * 60 * 1000;
      expired = diff > maxAge;
    }

    console.log('login expired?', expired);
    return !expired;
  }

  public login() {
    this.showModal().then(employee => {
      this.employee = employee;
      this.appSettings.set('employee', employee);
    });
  }

  public logout() {
    this.employee = null;
    this.appSettings.set('employee', null);
    this.login();
  }

  private showModal(): Promise<Employee> {
    return new Promise<Employee>((resolve, reject) => {
      if (AppConstants.DEBUG_MODE) {
        return resolve({
          employeenumber: '1',
          firstname: 'Test',
          lastname: 'Test',
          division: 'Vinyl',
          timestamp: Date.now()
        });
      }

      const modal = this.modalCtrl.create(AuthenticationComponent, null, { enableBackdropDismiss: false });
      modal.present();
      modal.onDidDismiss((employee: Employee) => resolve(employee));
    });
  }
}
