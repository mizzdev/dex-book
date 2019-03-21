import Big from 'big.js';
import { IOrder } from '.';
import { IBookControlContext } from '../Book';

/**
 * Represents a limit order. It has a stop price,
 * beyond which this order is converted to some other one depending on its subtype.
 */
export interface IStopOrder extends IOrder {

  /** The trigger price of the order */
  readonly price: Big;

  /** Implements stop order conversion strategy */
  convert(context: IBookControlContext): void;
}
