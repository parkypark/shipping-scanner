import { DeliveryIndex } from '../pages/delivery/delivery-index';
import { LoadingIndex } from '../pages/loading/loading-index';
import { RackContentsIndexPage } from '../pages/rack-contents/rack-contents.index';
import { ReturnPage } from '../pages/return/return';
import { TransferIndex } from '../pages/transfer/transfer-index';
import { UnloadingPage } from '../pages/unloading/unloading';

export interface IPage {
  component: any;
  icon: string;
  iconRotated?: boolean;
  title: string;
}

export class AppConstants {
  public static APP_VERSION: string = '3.4.11';
  public static DEBUG_MODE: boolean = false;

  public static pages: IPage[] = [
    {
      component: LoadingIndex,
      icon: 'log-in',
      title: 'Loading'
    },
    {
      component: DeliveryIndex,
      icon: 'log-out',
      title: 'Delivery'
    },
    {
      component: RackContentsIndexPage,
      icon: 'list',
      title: 'Rack Contents'
    },
    {
      component: ReturnPage,
      icon: 'log-in',
      iconRotated: true,
      title: 'Returns'
    },
    {
      component: TransferIndex,
      icon: 'move',
      title: 'Transfer'
    },
    {
      component: UnloadingPage,
      icon: 'log-in',
      iconRotated: true,
      title: 'Unloading'
    }
  ];
}
