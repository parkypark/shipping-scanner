export interface IPicklistItem {
  equals(other: IPicklistItem): boolean;

  id: number;
  barcode: string;
  boxnumber: string;
  frametype: string;
  itemdescription: string;
  lastupdate: Date;
  linenumber: string;
  listnumber: string;
  loadingcomplete: string;
  ordernumber: string;
  picklistid: number;
  productcode: string;
  racknumber: string;
  shippingcomplete: string;
  stationid: string;
  status: number;

  branch?: string;
  FV_UnitID?: string;
  isnotexception?: number;
  qc_pass?: boolean;
  scantime?: Date;
  screentype?: string;
  sitecontact?: string;
  siteemail?: string;
  statusdescription?: string;
  what?: string; // this is for the back end service to know what to update (rack vs status)
}

export class PickListItem implements IPicklistItem {
  public branch?: string;
  public FV_UnitID?: string;
  public isnotexception?: number;
  public qc_pass?: boolean;
  public scantime?: Date;
  public screentype?: string;
  public sitecontact?: string;
  public siteemail?: string;
  public statusdescription?: string;
  public what?: string;

  constructor(
    public id: number,
    public barcode: string,
    public boxnumber: string,
    public frametype: string,
    public itemdescription: string,
    public lastupdate: Date,
    public linenumber: string,
    public listnumber: string,
    public loadingcomplete: string,
    public ordernumber: string,
    public picklistid: number,
    public productcode: string,
    public racknumber: string,
    public shippingcomplete: string,
    public stationid: string,
    public status: number
  ) { }

  equals(other: IPicklistItem): boolean {
    return this.ordernumber === other.ordernumber && this.linenumber === other.linenumber && this.boxnumber === other.boxnumber;
  }

  public static clone(template: IPicklistItem) {
    const ret = new PickListItem(
      template.id,
      template.barcode,
      template.boxnumber,
      template.frametype,
      template.itemdescription,
      template.lastupdate,
      template.linenumber,
      template.listnumber,
      template.loadingcomplete,
      template.ordernumber,
      template.picklistid,
      template.productcode,
      template.racknumber,
      template.shippingcomplete,
      template.stationid,
      parseInt(template.status.toString(), 10)
    );

    const optionalStrings = [
      'branch',
      'FV_UnitID',
      'qc_pass',
      'screentype',
      'sitecontact',
      'siteemail',
      'statusdescription'
    ];

    for (let key of optionalStrings) {
      if (template.hasOwnProperty(key)) {
        ret[key] = template[key];
      }
    }

    if (template.hasOwnProperty('isnotexception')) {
      ret.isnotexception = parseInt(template.isnotexception.toString(), 10);
    } else {
      ret.isnotexception = 1;
    }

    if (parseInt(template.boxnumber, 10) > 100) {
      ret.barcode = `X${template.ordernumber}${template.boxnumber}V`;
    } else if (template.hasOwnProperty('FV_UnitID') && template.FV_UnitID) {
      ret.barcode = template.FV_UnitID;
    } else if (template.hasOwnProperty('screentype') && template.screentype) {
      ret.barcode = `SCR${template.ordernumber}${template.screentype}`;
    } else {
      ret.barcode = `M${template.ordernumber}${template.linenumber}V`;
    }

    return ret;
  }

  public static from(template: IPicklistItem): PickListItem {
    if (template.hasOwnProperty('isnotexception')) {
      template.isnotexception = parseInt(template.isnotexception.toString(), 10);
    } else {
      template.isnotexception = 1;
    }

    if (parseInt(template.boxnumber, 10) > 100) {
      template.barcode = `X${template.ordernumber}${template.boxnumber}V`;
    } else if (template.hasOwnProperty('FV_UnitID') && template.FV_UnitID) {
      template.barcode = template.FV_UnitID;
    } else if (template.hasOwnProperty('screentype') && template.screentype) {
      template.barcode = `SCR${template.ordernumber}${template.screentype}`;
    } else {
      template.barcode = `M${template.ordernumber}${template.linenumber}V`;
    }

    return template;
  }

  public static equals(first: PickListItem, second: PickListItem) {
    return first.barcode.length > 0 && first.barcode === second.barcode;
  }
}
