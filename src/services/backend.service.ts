import { forwardRef, Inject, Injectable } from '@angular/core';
import { Http, Response, Headers, RequestOptions, URLSearchParams } from '@angular/http';
import { Events } from 'ionic-angular';
import { CacheService } from 'ionic-cache';
import { Storage } from '@ionic/storage';

import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { catchError, map } from 'rxjs/operators';
import { defer } from 'rxjs/observable/defer';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { of } from 'rxjs/observable/of';

import { AppConstants } from '../app/app.constants';
import { AppSettingsService, Divisions } from '../services/app-settings.service';
import { AuthenticationService } from '../services/authentication.service';
import { NetworkMonitorService } from '../services/network-monitor.service';
import { NotificationService } from '../services/notification.service';
import { BayLocation } from '../models/bay-location';
import { Employee } from '../models/employee';
import { IHeader, Header } from '../models/header';
import { IPicklistItem, PickListItem } from '../models/picklist-item';
import { RackData } from '../models/rack-data';
import { ScanLogService } from '../services/scanlog.service';
import { IScanData } from './barcode.service';
import { Branches, BranchMeta, IBranchMeta } from '../models/branchMeta';

@Injectable()
export class BackEndService {
  public branchMeta: IBranchMeta[];

  private api = 'https://api.starlinewindows.com/production/v1';
  private authService: AuthenticationService;
  private hasOfflineUpdates: boolean = false;
  private updateRunning: boolean = false;
  private updateInterval: number = 5000;
  private updateTimer: any;

  constructor(
    private cache: CacheService,
    private http: Http,
    private storage: Storage,
    private appSettingsService: AppSettingsService,
    @Inject(forwardRef(() => AuthenticationService)) authService: AuthenticationService,
    private networkMonitorService: NetworkMonitorService,
    private notificationService: NotificationService,
    private scanLogService: ScanLogService,
    events: Events
  ) {
    this.authService = authService;

    events.subscribe('network.connected', () => {
      if (this.hasOfflineUpdates) {
        clearTimeout(this.updateTimer);
        this.start();
      }
    });

    this.cache.getItem('branchMeta').catch(() => BranchMeta.default()).then(result => this.branchMeta = result);
  }

  getEmployee(employeeId: string): Observable<Employee> {
    const url = `${this.api}/employee/${employeeId}`;

    return this.http.get(url).pipe(
      map(response => {
        return Employee.clone(response.json());
      }),
      catchError(error => {
        this.handleError(url, error);
        return of(null);
      })
    );
  }

  getItem(orderNumber: string, itemNumber: string): Observable<PickListItem> {
    if (!this.networkMonitorService.isOnline) {
      return fromPromise<IPicklistItem>(this.cache.getItem(orderNumber).catch(() => null).then(order => {
        if (!order) {
          console.log(`Failed to find order #${orderNumber} in the offline cache`);
          return null;
        }

        const isSearchingByLineNumber = parseInt(itemNumber, 10) < 100;
        for (let item of order.items) {
          if (isSearchingByLineNumber) {
            if (item.linenumber === itemNumber) {
              return item;
            }
          } else {
            if (item.boxnumber === itemNumber) {
              return item;
            }
          }
        }

        // item not found
        return null;
      }));
    }

    // isOnline
    const division = this.appSettingsService.get('division');
    const url = this.api + (division === Divisions.ALUMINUM ? '/pick-list/item' : '/vinyl-pick-list/item');

    const params: URLSearchParams = new URLSearchParams();
    params.set('orderNumber', orderNumber);
    params.set('boxOrLineNumber', itemNumber);

    return this.http.get(url, { search: params }).pipe(
      map(response => {
        this.scanLogService.log('ok', url, `Loaded item: ${orderNumber} - ${itemNumber}`);
        return this.importItem(response.json());
      }),
      catchError((error: any) => {
        this.handleError(url, error);
        return of(null);
      })
    );
  }

  getItemFromScreenBarcode(barcode: string): Observable<PickListItem> {
    const division = this.appSettingsService.get('division');
    const url = this.api + (division === Divisions.ALUMINUM
      ? `/pick-list/item-from-screen-barcode/${barcode}`
      : `/vinyl-pick-list/item-from-screen-barcode/${barcode}`);

    return this.http.get(url).pipe(
      map(response => this.importItem(response.json())),
      catchError((error: any) => {
        this.handleError(url, error);
        return of(null);
      })
    );
  }

  getItemFromSUBarcode(barcode: string): Observable<PickListItem> {
    const division = this.appSettingsService.get('division');
    const url = this.api + (division === Divisions.ALUMINUM
      ? `/pick-list/item-from-su-barcode/${barcode}`
      : `/vinyl-pick-list/item-from-su-barcode/${barcode}`);

    return this.http.get(url).pipe(
      map(response => this.importItem(response.json())),
      catchError((error: any) => {
        this.handleError(url, error);
        return of(null);
      })
    );
  }

  getItemsByOrderNumber(orderNumber: string) : Observable<PickListItem[]> {
    // works offline
    const division = this.appSettingsService.get('division');
    const url = this.api + (division === Divisions.ALUMINUM ? '/pick-list/items-by-ordernumber/' : '/vinyl-pick-list/items-by-ordernumber/') + orderNumber;

    if (!this.networkMonitorService.isOnline) {
      return fromPromise(this.cache.getItem(orderNumber).catch(() => []).then(response => {
        const items: PickListItem[] = [];
        for (let item of response.items) {
          if (item.hasOwnProperty('productcode') && item.productcode === 'R') {
            continue;
          }
          items.push(this.importItem(item));
        }
        this.scanLogService.log('ok', 'storage', `Loaded ${items.length} items for order #: ${orderNumber}`);
        return items;
      }));
    }

    return this.http.get(url).pipe(
      map(response => {
        const data = response.json().data;

        const items: PickListItem[] = [];
        for (let item of data) {
          if (item.hasOwnProperty('productcode') && item.productcode === 'R') {
            continue;
          }
          items.push(this.importItem(item));
        }

        this.scanLogService.log('ok', url, `Loaded ${items.length} items for order #: ${orderNumber}`);
        return items;
      }),
      catchError((error: any) => {
        this.handleError(url, error);
        return of([]);
      })
    );
  }

  getItemsByRackNumber(rackNumber: string) : Observable<RackData> {
    const division = this.appSettingsService.get('division');
    const url = this.api + (division === Divisions.ALUMINUM ? '/pick-list/items-by-racknumber/' : '/vinyl-pick-list/items-by-racknumber/') + rackNumber;

    return this.http.get(url).pipe(
      map(response => {
        const data = response.json().data;

        const items: PickListItem[] = [];
        for (let item of data) {
          items.push(this.importItem(item));
        }

        this.scanLogService.log('ok', url, `Loaded ${items.length} items for rack #: ${rackNumber}`);
        const rack = new RackData(rackNumber, null, items);
        return rack;
      }),
      catchError((error: any) => {
        this.handleError(url, error);
        return of({racknumber: rackNumber, location: null, data: []});
      })
    );
  }

  getLoadListItemsGroupedByOrder(loadListId: number): Observable<Map<string, PickListItem[]>> {
    if (!this.networkMonitorService.isOnline) {
      const ret = new Map<string, IPicklistItem[]>();
      return fromPromise(this.storage.forEach((val: any, key: string) => {
        if (val.hasOwnProperty('groupKey') && val.groupKey.includes('cachedWorkorder')) {
          const items: IPicklistItem[] = JSON.parse(val.value).items;
          for (let item of items) {
            if (item.picklistid === loadListId) {
              if (!ret.has(item.ordernumber)) {
                ret.set(item.ordernumber, []);
              }
              ret.get(item.ordernumber).push(item);
            }
          }
        }
      }).then(() => {
        return ret;
      }));
    }

    // online version
    const division = this.appSettingsService.get('division');
    const url = this.api + (division === Divisions.ALUMINUM ? '/pick-list/' : '/vinyl-pick-list/') + loadListId;

    return this.http.get(url).pipe(
      map(response => {
        this.scanLogService.log('ok', url, `Loaded load list: ${loadListId}`);

        const ret = new Map<string, PickListItem[]>();
        const data = response.json().data;
        const rackNumbers = Object.keys(data);

        for (let idxRack = 0; idxRack < rackNumbers.length; ++idxRack) {
          for (let idxItem = 0; idxItem < data[rackNumbers[idxRack]].data.length; ++idxItem) {
            const orderNumber = data[rackNumbers[idxRack]].data[idxItem].ordernumber;
            if (!ret.has(orderNumber)) {
              ret.set(orderNumber, []);
            }
            ret.get(orderNumber).push(this.importItem(data[rackNumbers[idxRack]].data[idxItem]));
          }
        }

        return ret;
      }),
      catchError(error => {
        this.handleError(url, error);
        return of(new Map<string, PickListItem[]>());
      })
    );
  }

  getPickListItemsGroupedByRack(pickListId: number): Observable<RackData[]> {
    const division = this.appSettingsService.get('division');
    const url = this.api + (division === Divisions.ALUMINUM ? '/pick-list/' : '/vinyl-pick-list/') + pickListId;

    return this.http.get(url).pipe(
      map(response => {
        this.scanLogService.log('ok', url, `Loaded picklist: ${pickListId}`);

        const data = response.json().data;
        const rackNumbers = Object.keys(data);

        for (let idxRack = 0; idxRack < rackNumbers.length; ++idxRack) {
          for (let idxItem = 0; idxItem < data[rackNumbers[idxRack]].data.length; ++idxItem) {
            data[rackNumbers[idxRack]].data[idxItem] = this.importItem(data[rackNumbers[idxRack]].data[idxItem]);
          }
        }

        return data;
      }),
      catchError(error => {
        this.handleError(url, error);
        return of([]);
      })
    );
  }

  getBays(): Observable<Map<string, BayLocation[]>> {
    const division = this.appSettingsService.get('division');
    const url = `${this.api}/bay-areas/${division}`;

    return this.http.get(url).pipe(
      map(response => {
        if (response === null) {
          this.scanLogService.log('ok', url, `No bay areas for division: ${division}`);
          return null;
        }

        const data = response ? response.json() : null;
        this.scanLogService.log('ok', url, `Loaded ${data.length} bay areas for division: ${division}`);

        const ret = new Map<string, BayLocation[]>();
        for (const key of Object.keys(data)) {
          const values: BayLocation[] = [];
          for (const value of data[key]) {
            values.push(BayLocation.clone(value));
          }
          ret.set(key, values);
        }
        return ret;
      }),
      catchError(error => {
        this.handleError(url, error);
        return of(null);
      })
    );
  }

  getBayNumber(rackNumber: string): Observable<string> {
    const url = `${this.api}/bay-area/${rackNumber}`;

    return this.http.get(url).pipe(
      map(response => {
        if (response === null) {
          this.scanLogService.log('ok', url, `No bay location for rack #${rackNumber}`);
          return null;
        }

        const data = response.json();
        this.scanLogService.log('ok', url, `Loaded bay location for rack #${rackNumber}: ${data}`);
        return data;
      }),
      catchError(error => {
        this.handleError(url, error);
        return of(null);
      })
    );
  }

  clearRackContents(rackNumber: string): Observable<boolean> {
    const url = `${this.api}/shipping/clear-rack-contents/${rackNumber}`;

    return this.http.post(url, null).pipe(
      map(response => {
        this.scanLogService.log('ok', url, `Cleared contents for rack #${rackNumber}`);
        return response.json();
      }),
      catchError(error => {
        this.handleError(url, error);
        return of(false);
      })
    );
  }

  getRackContents(rackNumber: string): Observable<PickListItem[]> {
    const url = `${this.api}/order-status`;

    const tableState = { search: { predicateObject: { racknumber: rackNumber } } };
    const params: URLSearchParams = new URLSearchParams();
    params.set('tableState', JSON.stringify(tableState));

    return this.http.get(url, { search: params }).pipe(
      map(response => {
        this.scanLogService.log('ok', url, `Loaded contents for rack #${rackNumber}`);

        const data = response.json().data;
        const items: PickListItem[] = [];
        for (let item of data) {
          items.push(this.importItem(item));
        }
        return items;
      }),
      catchError(error => {
        this.handleError(url, error);
        return of([]);
      })
    );
  }

  getServerTime(): Observable<number> {
    const url = `${this.api}/shipping/server-time`;
    return this.http.get(url).pipe(map(response => parseInt(response.json(), 10)));
  }

  getHeader(orderNumber: string): Observable<Header> {
    if (this.networkMonitorService.isOnline) {
      const divisionId = this.appSettingsService.getDivisionId();
      const url = `${this.api}/shipping/header/${divisionId}/${orderNumber}`;

      return this.http.get(url).pipe(
        map(response => Header.clone(response.json())),
        catchError((error: any) => {
          this.handleError(url, error);
          return of<Header>(null);
        })
      );
    }

    return fromPromise<Header>(this.cache.getItem(orderNumber).catch(() => null).then(order => {
      return order && order.hasOwnProperty('header') ? order.header : null;
    }));
  }

  getWorkorders(branch: string): Observable<number> {
    const divisionId = this.appSettingsService.getDivisionId();
    const url = `${this.api}/shipping/workorders2/${divisionId}/${branch}`;

    return new Observable<number>(observer => {
      this.cache.clearGroup(`cachedWorkorder${branch}`).then(() => {
        console.log('fetching workorders');
        this.http.get(url)
          .pipe(map(response => response.json()))
          .subscribe(data => {
            const ordernumbers = Object.keys(data);
            const promises = [];
            let totalItems = 0;

            console.log('got workorders:', ordernumbers);

            for (let ordernumber of ordernumbers) {
              for (let item of data[ordernumber].items) {
                item = PickListItem.clone(item);
              }
              console.log('cloning header:', data[ordernumber].header);
              data[ordernumber].header = Header.clone(data[ordernumber].header);

              totalItems += data[ordernumber].length;
              promises.push(this.cache.saveItem(ordernumber, data[ordernumber], `cachedWorkorder${branch}`));
            }

            Promise.all(promises).then(() => {
              console.log('importing orders complete, updating metadata');
              for (let i = 0; i < this.branchMeta.length; ++i) {
                if (this.branchMeta[i].code === branch) {
                  this.branchMeta[i].totalOrders = ordernumbers.length;
                  this.branchMeta[i].totalItems = totalItems;
                  this.branchMeta[i].lastUpdate = new Date();
                  this.cache.saveItem('branchMeta', this.branchMeta).then(() => {
                    observer.next(ordernumbers.length);
                    observer.complete();
                  });
                  break;
                }
              }
              console.log('finished');
            });
          }, err => observer.error(err));
      });
    });
  }

  processOfflineUpdates() {
    const promises: Promise<boolean>[] = [];
    this.updateRunning = true;

    this.storage.forEach((val: any, key: string) => {
      if (key === 'external-scanlog') {
        const log = JSON.parse(val.value);
        for (let entry of log) {
          if (AppConstants.DEBUG_MODE) {
            console.log('pretending to post', entry, 'to', `${this.api}/scan-log`);
            promises.push(Promise.resolve(true));
            return;
          }
          promises.push(new Promise(resolve => {
            this.http.post(`${this.api}/scan-log`, entry).subscribe(response => resolve(response.status === 200));
          }));
        }
        return;
      }

      if (key === 'proof-of-delivery') {
        const podList = JSON.parse(val.value);
        for (let pod of podList) {
          if (AppConstants.DEBUG_MODE) {
            console.log('pretending to post', pod.params, 'to', pod.url);
            promises.push(Promise.resolve(true));
            return;
          }
          promises.push(new Promise(resolve => {
            this.http.post(pod.url, pod.params).subscribe(response => resolve(response.status === 200));
          }));
        }
      }

      if (val && val.groupKey && val.groupKey !== 'none') {
        switch (val.groupKey) {
          case 'updateItems':
            const items: IPicklistItem[] = JSON.parse(val.value).items;

            if (AppConstants.DEBUG_MODE) {
              console.log('pretending to update items', val.groupKey, items);
              promises.push(new Promise(resolve => {
                for (let item of items.filter(i => i.what)) {
                  delete item.what;
                }
                this.cache.saveItem(key, items).then(() => resolve(true));
              }));
              return;
            }

            console.log('Preparing to update items:', val.groupKey, items);
            promises.push(new Promise(resolve => {
              const itemsToUpdate = items.filter(i => i.what);

              this.updateItems(itemsToUpdate).subscribe(success => {
                if (success) {
                  for (let item of items) {
                    if (item.what) {
                      delete item.what;
                    }
                  }
                  this.cache.saveItem(key, items).then(() => resolve(true));
                } else {
                  resolve(false)
                }
              });
            }));
            break;
          case 'updateBay':
            const bayNumber = val.value;
            const rackNumber = key.replace('rack-transfer-', '');

            if (AppConstants.DEBUG_MODE) {
              console.log('pretending to update shipping bay for rack', rackNumber, bayNumber);
              promises.push(Promise.resolve(true));
              return;
            }

            console.log('Preparing to update shipping bay for rack:', rackNumber, bayNumber);
            promises.push(new Promise(resolve => {
              this.updateShippingBay(rackNumber, bayNumber).subscribe(success => {
                if (success) {
                  this.cache.removeItem(key).then(() => resolve(true));
                } else {
                  resolve(false);
                }
              });
            }));
          break;
        }
      }
    }).then(() => {
      Promise.all(promises).then(results => {
        const cleanup: Promise<any>[] = [
          this.cache.removeItem('external-scanlog'),
          this.cache.removeItem('proof-of-delivery')
        ];

        for (let meta of this.branchMeta) {
          meta.ordersQueued = [];
        }
        cleanup.push(this.cache.saveItem('branchMeta', this.branchMeta));

        Promise.all(cleanup).then(() => {
          console.log('Synchronized offline storage to server');
          this.hasOfflineUpdates = false;
          this.updateRunning = false;
          this.scanLogService.log('ok', 'storage', 'Background synchronization complete');
          this.notificationService.showOfflineDataSynchronized();
        });
      });
    });
  }

  processOfflineUpdatesLoop() {
    if (!this.updateRunning) {
      this.stop();
      this.start();
    }
  }

  start() {
    if (this.networkMonitorService.isOnline && this.hasOfflineUpdates && !this.updateRunning) {
      console.log('BackEndService: processing offline storage');
      this.processOfflineUpdates();
    } else {
      this.updateTimer = setTimeout(() => this.processOfflineUpdatesLoop(), this.updateInterval);
    }
  }

  stop() {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
  }

  updateItems(items: PickListItem[], operation: string = 'Updated'): Observable<boolean> {
    const division = this.appSettingsService.get('division');
    const url = this.api + (division === Divisions.ALUMINUM ? '/pick-list/u2' : '/vinyl-pick-list/u2');
    const employeeId = this.authService.employee.employeenumber;
    const headers = new Headers({ 'Content-Type': 'application/json' });
    const options = new RequestOptions({ headers });

    if (!this.networkMonitorService.isOnline) {
      console.log('updateItems(): offline');
      return new Observable<boolean>(observer => {
        this.stop();

        // get unique list of orders
        const orderNumbers = new Set<string>();
        for (let item of items) {
          orderNumbers.add(item.ordernumber);
        }
        const orderNumberArr = Array.from(orderNumbers);
        console.log('updateItems(): orderNumbers =', orderNumberArr);

        defer(async () => {
          for (const orderNumber of orderNumberArr) {
            const order = await this.cache.getItem(orderNumber);
            let found = false;

            for (let i = 0; i < order.items.length; ++i) {
              for (let item of items) {
                if (item.equals(order.items[i])) {
                  order.items[i] = item;
                  found = true;
                  break;
                }
              }

              if (found) {
                // update the store and mark the order as dirty
                await this.cache.saveItem(orderNumber, order, 'updateItems', Number.MAX_SAFE_INTEGER);
                this.scanLogService.log('ok', 'storage', `${operation} order #${orderNumber}`);
                this.hasOfflineUpdates = true;

                for (let branchMeta of this.branchMeta) {
                  if (branchMeta.code === order.branch) {
                    if (branchMeta.ordersQueued.indexOf(orderNumber) === -1) {
                      branchMeta.ordersQueued.push(orderNumber);
                      console.log('updateItems(): pushed order # to branch meta', branchMeta);
                      await this.cache.saveItem('branchMeta', this.branchMeta);
                    };
                    break;
                  }
                }
              } else {
                this.scanLogService.log('error', 'storage', `order #${orderNumber} not found in offline cache`);
              }
            }
          }
        }).subscribe(() => {
          this.start();
          observer.next(true);
          observer.complete();
        });
      });
    }

    return this.http.post(url, { employeeId, items }, options).pipe(
      map(response => {
        this.scanLogService.log('ok', url, `${operation} ${items.length} items`);
        return response.json();
      }),
      catchError(error => {
        this.handleError(url, error);
        return of(false);
      })
    );
  }

  updateShippingBay(rackNumber: string, bayNumber: string): Observable<boolean> {
    const url = `${this.api}/bay-area`;
    const employeeId = this.authService.employee.employeenumber;

    if (!this.networkMonitorService.isOnline) {
      this.stop();

      this.cache.saveItem(`rack-transfer-${rackNumber}`, bayNumber, 'updateBay', Number.MAX_SAFE_INTEGER).then(() => {
        this.hasOfflineUpdates = true;
        this.start();
        this.scanLogService.log('ok', 'storage', `Assigned rack #${rackNumber} to bay #${bayNumber}`);
      }).catch(reason => {
        this.handleError('storage', reason);
        this.start();
      });

      return of(true);
    }

    return this.http.put(url, { employeeId, rackNumber, bayNumber }).pipe(
      map(response => {
        this.scanLogService.log('ok', url, `Assigned rack #${rackNumber} to bay #${bayNumber}`);
        return true;
      }),
      catchError(error => {
        this.handleError(url, error);
        return of(false);
      })
    );
  }

  writeProofOfDelivery(
    ordernumber: string,
    items: IPicklistItem[],
    comments: string,
    customerEmail: string,
    receiverName: string,
    signature: string,
    location: number[],
    photos: string[]
  ): Observable<boolean> {
    const divisionId = this.appSettingsService.getDivisionId();
    const employeeId = this.authService.employee.employeenumber;
    const data = {
      url: `${this.api}/shipping/proof-of-delivery/${divisionId}/${ordernumber}`,
      params: { employeeId, items, comments, customerEmail, receiverName, signature, location, photos }
    };

    if (!this.networkMonitorService.isOnline) {
      this.stop();

      this.cache.getItem('proof-of-delivery')
        .catch(() => [])
        .then(response => {
          response.push(data);
          this.cache.saveItem(`proof-of-delivery`, response).then(() => {
            this.hasOfflineUpdates = true;
            this.start();
          });
        });

      return of(true);
    }

    return this.http.post(data.url, data.params).pipe(
      map(response => {
        if (response.status === 200 && response.json()) {
          this.scanLogService.log('ok', data.url, `Completed proof of delivery for order #${ordernumber}`);
          return true;
        }
      }),
      catchError(error => {
        this.handleError(data.url, error);
        return of(false);
      })
    );
  }

  writeLog(page: string, scan: IScanData, isError: boolean) {
    const division_id = this.appSettingsService.getDivisionId();
    const operator = this.authService.employee.employeenumber;
    const data = { division_id, operator, payload: { page, scan }, isError };

    if (AppConstants.DEBUG_MODE) {
      console.log('Would log to db if not in debug mode:', data);
      return;
    }

    if (!this.networkMonitorService.isOnline) {
      this.stop();

      return this.cache.getItem('external-scanlog')
        .catch(() => [])
        .then(log => {
          log.push(data);
          this.cache.saveItem('external-scanlog', log).then(() => {
            this.hasOfflineUpdates = true;
            this.start();
          });
        });
    }

    return this.http.post(`${this.api}/scan-log`, data).subscribe(() => {
      console.log('posted scanlog:', data);
    });
  }

  writeLogMessage(subject: string, message: string): Observable<boolean> {
    const division_id = this.appSettingsService.getDivisionId();
    const operator = this.authService.employee.employeenumber;
    const data = { division_id, operator, subject, message };

    if (AppConstants.DEBUG_MODE) {
      console.log('Would log to db if not in debug mode:', data);
      return;
    }

    if (!this.networkMonitorService.isOnline) {
      this.stop();

      return fromPromise(this.cache.getItem('external-scanlog')
        .catch(() => [])
        .then(log => {
          log.push(data);
          this.cache.saveItem('external-scanlog', log).then(() => {
            this.hasOfflineUpdates = true;
            this.start();
          });
        })).map(() => true);
    }

    return this.http.post(`${this.api}/scan-log`, data).map(() => true);
  }

  //////////////////////////////////////////////////////////////////////////////
  // private
  //////////////////////////////////////////////////////////////////////////////

  private handleError(url: string, error: any) {
    if (!error) {
      this.scanLogService.logHttpError(url, 'No data');
    }
    this.scanLogService.logHttpError(url, error.json().error || 'Server error');
  }

  private importItem(item: IPicklistItem): PickListItem {
    return PickListItem.clone(item);
  }
}
