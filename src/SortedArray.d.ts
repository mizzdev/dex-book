declare module 'sorted-array' {
  class SortedArray {
    public array: any[];
    constructor(array: any[], comparator: (a: any, b: any) => number)
    public insert(element: any): any;
    public remove(element: any): any;
  }
  export = SortedArray;
}
