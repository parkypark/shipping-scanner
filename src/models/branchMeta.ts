export const Branches = {
  LOCAL: 'LAN',
  KEL: 'KEL',
  ISL: 'ISL',
  ISLP: 'ISLP'
};

export interface IBranchMeta {
  code: string;
  name: string;
  lastUpdate: Date;
  totalItems: number;
  totalOrders: number;
  ordersQueued: string[];
}

export class BranchMeta implements IBranchMeta {
  constructor(
    public code: string,
    public name: string,
    public lastUpdate: Date,
    public totalItems: number,
    public totalOrders: number,
    public ordersQueued: string[]
  ) {
  }

  static default(): IBranchMeta[] {
    return [
      new BranchMeta(Branches.LOCAL, 'Local', null, 0, 0, []),
      new BranchMeta('KEL', 'Kelowna', null, 0, 0, []),
      new BranchMeta('ISLP', 'Nanaimo', null, 0, 0, []),
      new BranchMeta('ISL', 'Victoria', null, 0, 0, [])
    ];
  }
}
