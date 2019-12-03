export class BayLocation {
  constructor(
    public id: number,
    public division: string,
    public bay_area: string,
    public bay_type: string
  ) {}

  public toString() {
    switch (this.bay_type) {
      case 'branch':
        switch (this.bay_area) {
          case 'KEL':
            return 'Kelowna';
          case 'ISL':
            return 'Victoria';
          case 'ISLP':
            return 'Nanaimo';
          default:
            return this.bay_area;
        }
      case 'other':
        if (this.bay_area.indexOf('Boneyard') === -1) {
          return this.bay_area;
        }

        const parts = this.bay_area.split('-');
        if (parts.length < 2) {
          return this.bay_area;
        }

        switch (parts[0]) {
          case 'KEL':
            return parts[1] + ' (Kelowna)';
          case 'ISL':
            return parts[1] + ' (Victoria)';
          case 'ISLP':
            return parts[1] + ' (Nanaimo)';
          case 'SUR':
            return parts[1] + ' (Surrey)';
          default:
            return this.bay_area;
        }
      default:
        return this.bay_area;
    }
  }

  public static clone(template: BayLocation) {
    return new BayLocation(template.id, template.division, template.bay_area, template.bay_type);
  }
}
