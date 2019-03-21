import Big from 'big.js';
import { IOrder } from '../Order';

/**
 * Contains orders of a book side.
 * Provides access to order insertion/removal and top price/order retrieval operations.
 */
export interface IBinContainer {

  /** Returns the top order if the container is not empty. */
  pickTopOrder(): {
    /** Container non-emptiness flag. If false - the book side has no orders inside. */
    hasTop: boolean;
    /** The top order of the book side. */
    order?: IOrder
  };

  /**
   * Returns the top order price if the container is not empty.
   */
  pickTopPrice(): {
    /** Container non-emptiness flag. If false - the book side has no orders inside. */
    hasTop: boolean;
    /** The top price of the book side. */
    price?: Big
  };

  /**
   * Inserts an order into the book side. This may change the top price and top order.
   * @param price - price bin to put the target order in
   * @param order - an order to be inserted
   */
  insertOrder(price: Big, order: IOrder): void;

  /**
   * Removes an order from the book side. This may change the top price and top order.
   * @param price - price bin to search for the target order in
   * @param order - an order to be removed
   */
  removeOrder(price: Big, order: IOrder): void;
}
