import { Component, ViewChild } from '@angular/core';
import { Content, ModalController, NavParams, ViewController } from 'ionic-angular';
import { Subscription } from 'rxjs/Subscription';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { CacheService } from 'ionic-cache';
import { BayLocation } from '../models/bay-location';
import { BackEndService } from '../services/backend.service';

@Component({
  selector: 'modal-bay-chooser',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Choose Bay</ion-title>
        <ion-buttons start>
          <button ion-button (click)="dismiss()">
            <span ion-text color="primary" showWhen="ios">Cancel</span>
            <ion-icon name="md-close" showWhen="android,windows"></ion-icon>
          </button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-searchbar id="location-search" *ngIf="!!bayType" (ionInput)="setFilter($event)"></ion-searchbar>

      <ion-list>
        <button id="{{bay.id}}" ion-item *ngFor="let bay of getBays(bayType)" (click)="onBayClicked(bay)">
          <span>{{bay.toString().toUpperCase()}}</span>
        </button>
      </ion-list>
    </ion-content>
  `
})
export class BayChooser {
  public bayType: string;
  private bayAreas: Map<string, BayLocation[]>;
  private filter: string = '';
  private subscriptions: Subscription[] = [];
  private scrollTo: BehaviorSubject<string> = new BehaviorSubject(null);

  @ViewChild(Content) content: Content;

  constructor(
    private viewCtrl: ViewController,
    private backEndService: BackEndService,
    private cache: CacheService
  ) {}

  getBays(bayType: string) {
    if (!this.bayAreas) {
      return null;
    }
    if (!bayType) {
      return Array.from(this.bayAreas.keys());
    }

    const bays = Array.from(this.bayAreas.get(bayType));
    return this.filter.length > 0 ? bays.filter(bay => bay.toString().indexOf(this.filter) !== -1) : bays;
  }

  dismiss() {
    this.viewCtrl.dismiss();
  }

  ionViewDidEnter() {
    this.subscriptions = [
      this.backEndService.getBays().subscribe(result => { this.bayAreas = result; }),
      this.scrollTo.subscribe(value => this.scrollToElement(value))
    ];
  }

  ionViewDidLeave() {
    for (let subscription of this.subscriptions) {
      if (!subscription.closed) {
        subscription.unsubscribe();
      }
    }
  }

  onBayClicked(bay: string|BayLocation) {
    if (typeof bay === 'string') {
      this.bayType = bay;
      this.cache.getItem('last-bay-transferred').catch(() => null).then((bay: BayLocation) => {
        if (bay) {
          console.log('scrolling to element with id:', bay.id);
          this.scrollTo.next(bay.id.toString());
        }
      });
    } else {
      this.cache.saveItem('last-bay-transferred', bay).then(() => {
        this.viewCtrl.dismiss(bay);
      });
    }
  }

  setFilter(event: Event) {
    const filter = (<any>event.target).value;
    this.filter = !!filter ? filter.trim() : '';
  }

  private scrollToElement(id: string) {
    if (!id) return;

    const el = document.getElementById(id);
    if (el) {
      const searchBar = document.getElementById('location-search');
      this.content.scrollTo(0, el.getBoundingClientRect().top - searchBar.getBoundingClientRect().height, 300);
    }
  }
}
