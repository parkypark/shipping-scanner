import { PickListItem } from './picklist-item';

export class RackData {
    constructor(
        public racknumber: string,
        public location: string,
        public data: PickListItem[]
    ) { }

    public static clone(template: RackData) {
        const items: PickListItem[] = [];
        for (let i of template.data) {
            items.push(PickListItem.clone(i));
        }
        return new RackData(template.racknumber, template.location, items);
    }

    public static equals(first: RackData, second: RackData) {
        if (first.racknumber !== second.racknumber) {
            return false;
        }

        for (let itemFromFirst of first.data) {
            const itemFromSecond = second.data.find(item => { return item.barcode === itemFromFirst.barcode; });
            if (itemFromFirst.status !== itemFromSecond.status) {
                return false;
            }
        }
        return true;
    }
}
