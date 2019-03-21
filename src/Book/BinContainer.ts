import Big from 'big.js';
import SortedArray = require('sorted-array');
import { IBinContainer } from '.';
import { IOrder } from '../Order';
import { IDictionary } from '../Util';

function ascendingComparator(a: Big, b: Big): number {
  if (a.eq(b)) { return 0; }
  return a.gt(b) ? 1 : -1;
}

function descendingComparator(a: Big, b: Big): number {
  if (a.eq(b)) { return 0; }
  return a.lt(b) ? 1 : -1;
}

/**
 * Contains orders of a book side sorted by price (price bins) and insertion time
 * in the specified sorting order.
 * Provides access to order insertion/removal and top price/order retrieval operations.
 * Top prices picking implements *price-time matching algorithm*.
 * Insertions and removals use *binary search* and are performed in *O(1)* - *O(log(n))* time
 * depending on how far the target order is from the book top.
 */
export class BinContainer implements IBinContainer {

  private static comparators: IDictionary<(a: Big, b: Big) => number> = {
    ASC: ascendingComparator,
    DESC: descendingComparator
  };

  private index: SortedArray;
  private bins: IDictionary<IOrder[]> = {};

  /**
   *
   * @param sortingOrder - determines how the prices are sorted in the book side.
   * If **"ASC"** (ascending), the top price is always the lowest.
   * If **"DESC"** (descending), the top price is always the highest.
   */
  constructor(sortingOrder: 'ASC' | 'DESC') {

    const comparator = BinContainer.comparators[sortingOrder];

    this.index = new SortedArray([], comparator);
  }

  public pickTopPrice(): { hasTop: boolean; price?: Big } {

    if (!this.index.array.length) {
      return { hasTop: false }; // No bins
    }

    const [topPrice] = this.index.array;

    return { hasTop: true, price: topPrice };
  }

  public pickTopOrder(): { hasTop: boolean; order?: IOrder } {

    const { hasTop, price: topPrice } = this.pickTopPrice();

    if (!hasTop) {
      return { hasTop: false };
    }

    return { hasTop: true, order: this.bins[(topPrice as Big).toString()][0] };
  }

  public insertOrder(price: Big, order: IOrder) {

    const key = price.toString();

    if (this.bins[key]) {
      // O(1) time (search of the price bin in the dictionary)
      this.bins[key].push(order);
    } else {
      this.bins[key] = [order];
      this.index.insert(price); // O(log(n)) time (binary search)
    }
  }

  public removeOrder(price: Big, order: IOrder) {

    const key = price.toString();

    const bin = this.bins[key];
    const orderIdx = bin.findIndex((o) => (o.id === order.id));

    bin.splice(orderIdx, 1);

    if (!bin.length) {
      // Order removal made its price bin empty (zero-sized); No need to keep the bin in book anymore;
      delete this.bins[key];

      if (this.index.array[0].eq(price)) {
        // Removal from the top: very common case
        this.index.array.shift(); // O(1) time (first element removal)
      } else {
        this.index.remove(price); // O(log(n)) time (binary search)
      }
    }
  }
}
