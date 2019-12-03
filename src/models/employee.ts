export class Employee {
  constructor(
    public employeenumber: string,
    public firstname: string,
    public lastname: string,
    public division: string,
    public timestamp: number
  ) {}

  public static offlineDefault() {
    return new Employee('0', 'OFFLINE', 'OFFLINE', 'Vinyl', Date.now());
  }

  public static clone(template: Employee) {
    const timestamp = template.timestamp || Date.now();
    return new Employee(template.employeenumber, template.firstname, template.lastname, template.division, timestamp);
  }
}
