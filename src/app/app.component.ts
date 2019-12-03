import { Component, HostListener, ViewChild } from '@angular/core';
import { Alert, AlertController, Events, LoadingController, Nav, Platform } from 'ionic-angular';
import { Keyboard } from '@ionic-native/keyboard';
import { SplashScreen } from '@ionic-native/splash-screen';
import { StatusBar } from '@ionic-native/status-bar';
import { CacheService } from 'ionic-cache';
import { AppConstants, IPage } from './app.constants';
import { AppSettingsService } from '../services/app-settings.service';
import { AuthenticationService } from '../services/authentication.service';
import { BackEndService } from '../services/backend.service';
import { NetworkMonitorService } from '../services/network-monitor.service';
import { ScanLogService } from '../services/scanlog.service';
import { Home } from '../pages/home/home';

declare var cordova: any;
declare var window: any;

@Component({
  templateUrl: 'app.html',
  providers: [Keyboard]
})
export class MyApp {
  public AppConstants: AppConstants = AppConstants;

  @ViewChild(Nav) nav: Nav;
  rootPage: any = Home;

  private pages: IPage[];
  private disconnectedAlert: Alert;
  private disconnectedAlertOpen: boolean;

  constructor(
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private cache: CacheService,
    private events: Events,
    private keyboard: Keyboard,
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private appSettingsService: AppSettingsService,
    private authService: AuthenticationService,
    private backEndService: BackEndService,
    private networkMonitorService: NetworkMonitorService,
    private scanLogService: ScanLogService,
    authenticationService: AuthenticationService
  ) {
    this.pages = AppConstants.pages;
    this.initializeApp();
  }

  @HostListener('click', ['$event'])
  onClickGlobal() {
    const employee = this.appSettingsService.get('employee');
    if (employee) {
      employee.timestamp = Date.now();
      this.appSettingsService.set('employee', employee);
    }
  }

  initializeApp() {
    this.platform.ready().then(() => {
      console.log('platform ready');

      this.cache.setDefaultTTL(60 * 60 * 12); // 12 hours
      this.cache.setOfflineInvalidate(false); // don't invalidate cache when in offline mode

      this.networkMonitorService.start(); // start network monitoring service

      const loading = this.loadingCtrl.create({content: 'Please wait...'});
      loading.present();
      this.appSettingsService.ready().then(() => {
        loading.dismiss();
        if (!this.authService.isLoggedIn()) {
          this.authService.login();
        }
      });

      this.events.subscribe('network.disconnected', () => {
        const pageName = this.nav.getActive().name;
        if (pageName.indexOf('Home') === -1 && pageName.indexOf('Delivery') === -1) {
          //this.networkMonitorService.showDisconnectedAlert();
        }
      });

      this.events.subscribe('network.connected', () => {
        this.networkMonitorService.hideDisconnectedAlert();
      });

      this.backEndService.start(); // start offline storage processing loop

      if (window.cordova) {
        this.statusBar.styleDefault();
        this.statusBar.hide();
        this.splashScreen.hide();

        // sometimes the statusbar comes back when the keyboard is open and results in ugliness
        this.keyboard.onKeyboardHide().subscribe(() => {
          this.statusBar.hide();
        });
      }
    });
  }

  division() {
    return this.appSettingsService.get('division');
  }

  employee() {
    const employee = this.appSettingsService.get('employee');
    return employee ? `${employee.firstname} ${employee.lastname}` : 'Invalid User!';
  }

  openPage(page: IPage) {
    // Reset the content nav to have just this page
    // we wouldn't want the back button to show in this scenario
    this.nav.setRoot(page.component);
  }
}
