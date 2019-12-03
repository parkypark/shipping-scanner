import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { AppConstants, IPage } from '../../app/app.constants';

@Component({
    selector: 'page-home',
    templateUrl: 'home.html'
})
export class Home {
    pages = AppConstants.pages;

    constructor(public navCtrl: NavController) {}

    openPage(page: IPage) {
        this.navCtrl.setRoot(page.component);
    }
}
