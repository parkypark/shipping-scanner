import { NgModule, ErrorHandler } from '@angular/core';
import { IonicStorageModule } from '@ionic/storage';
import { Camera } from '@ionic-native/camera';
import { Geolocation } from '@ionic-native/geolocation';
import { Network } from '@ionic-native/network';
import { SplashScreen } from '@ionic-native/splash-screen';
import { StatusBar } from '@ionic-native/status-bar';
import { Vibration } from '@ionic-native/vibration';
import { BrowserModule } from '@angular/platform-browser';
import { CacheModule } from 'ionic-cache';
import { HttpModule } from '@angular/http';
import { IonicApp, IonicModule, IonicErrorHandler } from 'ionic-angular';
import { SignaturePadModule } from 'angular2-signaturepad';

import { MyApp } from './app.component';

import { AppSettingsService } from '../services/app-settings.service';
import { AuthenticationService } from '../services/authentication.service';
import { BarcodeService } from '../services/barcode.service';
import { BackEndService } from '../services/backend.service';
import { NetworkMonitorService } from '../services/network-monitor.service';
import { NotificationService } from '../services/notification.service';
import { ScanLogService } from '../services/scanlog.service';
import { ScannerService } from '../services/scanner.service';

import { AppHeader } from '../components/app-header';
import { AuthenticationComponent } from '../components/authentication';
import { BayChooser } from '../components/bay-chooser';
import { SignaturePadModal } from '../components/signature-pad';
import { Home } from '../pages/home/home';
import { DeliveryIndex } from '../pages/delivery/delivery-index';
import { DeliveryLoadListPage } from '../pages/delivery/delivery-loadlist';
import { DeliveryOrder } from '../pages/delivery/delivery-order';
import { DeliveryConfirmationPage } from '../pages/delivery/delivery-confirmation';
import { LoadingIndex } from '../pages/loading/loading-index';
import { LoadingPickList } from '../pages/loading/loading-picklist';
import { RackContentsIndexPage } from '../pages/rack-contents/rack-contents.index';
import { RackContentsContentPage } from '../pages/rack-contents/rack-contents.content';
import { ReturnPage } from '../pages/return/return';
import { ScanLogPage } from '../pages/scan-log/scan-log';
import { SettingsPage } from '../pages/settings/settings';
import { TransferIndex } from '../pages/transfer/transfer-index';
import { TransferItem } from '../pages/transfer/transfer-item';
import { TransferRack } from '../pages/transfer/transfer-rack';
import { UnloadingPage } from '../pages/unloading/unloading';

const prodMode: boolean = window.hasOwnProperty('cordova');

@NgModule({
  declarations: [
    MyApp,
    AppHeader,
    AuthenticationComponent,
    BayChooser,
    Home,
    DeliveryIndex,
    DeliveryLoadListPage,
    DeliveryOrder,
    DeliveryConfirmationPage,
    LoadingIndex,
    LoadingPickList,
    RackContentsIndexPage,
    RackContentsContentPage,
    ReturnPage,
    ScanLogPage,
    SettingsPage,
    SignaturePadModal,
    TransferIndex,
    TransferItem,
    TransferRack,
    UnloadingPage
  ],
  imports: [
    BrowserModule,
    HttpModule,
    CacheModule.forRoot(),
    IonicModule.forRoot(MyApp, {
      scrollAssist: true,
      autoFocusAssist: true,
      prodMode
    }),
    IonicStorageModule.forRoot({
      name: 'shippingScanner',
      driverOrder: ['sqlite', 'indexeddb', 'websql']
    }),
    SignaturePadModule
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    AuthenticationComponent,
    Home,
    BayChooser,
    DeliveryIndex,
    DeliveryLoadListPage,
    DeliveryOrder,
    DeliveryConfirmationPage,
    LoadingIndex,
    LoadingPickList,
    RackContentsIndexPage,
    RackContentsContentPage,
    ReturnPage,
    ScanLogPage,
    SettingsPage,
    SignaturePadModal,
    TransferIndex,
    TransferItem,
    TransferRack,
    UnloadingPage
  ],
  providers: [
    SplashScreen,
    Camera,
    Geolocation,
    Network,
    StatusBar,
    Vibration,
    { provide: ErrorHandler, useClass: IonicErrorHandler },
    AppSettingsService,
    AuthenticationService,
    BarcodeService,
    BackEndService,
    NetworkMonitorService,
    NotificationService,
    ScanLogService,
    ScannerService
  ]
})
export class AppModule { }
