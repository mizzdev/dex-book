import Big from 'big.js';
import { IOrder } from './IOrder';

/**
 * Order fill data passed to ORDER_FILLED event listeners
 */
export interface IOrderFill {

  /** Order being filled */
  readonly order: IOrder;

  /** Opposing order of the fill */
  readonly oppositeOrder: IOrder;

  /** Price of the trade which resulted to the fill */
  readonly price: Big;

  /** Quantity filled */
  readonly qty: Big;

  /** If the fill quantity was enough to completely execute the order */
  readonly isFull: boolean;
}
