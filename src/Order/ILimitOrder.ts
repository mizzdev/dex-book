import Big from 'big.js';
import { IOrder } from '.';
import { IBookControlContext } from '../Book';

/**
 * Represents a limit order. It has a limit price,
 * which forbids this order to be traded with any less profitable price than specified.
 * May be removed from the book if cancelled or if completely executed during a trade.
 */
export interface ILimitOrder extends IOrder {

  /** Limit price of the order */
  readonly price: Big;

  /** Removes the limit order from the limit book side */
  removeFromBook(context: IBookControlContext): void;
}
