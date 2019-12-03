export interface IHeader {
  customername: string;
  totalitems: number;
  deliveryaddress: string;
  customercode?: string;
  deliverycity?: string;
  sitecontact?: string;
  siteemail?: string;
  isproject?: boolean;
}

export class Header implements IHeader {
  public customercode?: string;
  public deliverycity?: string;
  public sitecontact?: string;
  public siteemail?: string;
  public isproject?: boolean;

  constructor(
    public customername: string,
    public totalitems: number,
    public deliveryaddress: string
  ) {}

  public static clone(template: IHeader) {
    const ret = new Header(template.customername, template.totalitems, template.deliveryaddress);

    for (let key of ['customercode', 'deliverycity', 'sitecontact', 'siteemail', 'isproject']) {
      if (template.hasOwnProperty(key)) {
        ret[key] = template[key];
      }
    }

    return ret;
  }
}
