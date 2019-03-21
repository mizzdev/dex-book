import Big from 'big.js';
import { IOrder } from '../Order';

/**
 * Trade data passed to TRADE event listeners
 */
export interface ITrade {

  /** Newcoming (aggressing) order */
  readonly order: IOrder;

  /** Matched (resting) order */
  readonly oppositeOrder: IOrder;

  /** Price of the trade */
  readonly price: Big;

  /** Quantity traded */
  readonly qty: Big;
}
