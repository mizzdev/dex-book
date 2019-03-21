import { Big } from 'big.js';

import { IBinContainer, IBookNotifier } from '.';
import { IOrder } from '../Order';

/**
 * Book control context. Maintains the state of the whole book.
 * Stores orders and provides them with the API to interact with each other through it.
 */
export interface IBookControlContext {

  /** The top price of the bid (buy) book side */
  bid?: Big;

  /** The top price of the ask (sell) book side */
  ask?: Big;

  /** The price of the last trade */
  marketPrice?: Big;

  /** The market price prior to the last trade */
  previousMarketPrice?: Big;

  /** The event-emitting interface of the book */
  readonly notifier: IBookNotifier;

  /**
   * Finds an order with the specified *id*
   * @param orderId - the *id* of the order
   */
  findOrderById(orderId: string): {
    /** Tells whether the book stores an order with the specified *id* */
    isRegistered: boolean;
    /** The found order */
    order?: IOrder
  };

  /**
   * Stores the order, making it searcheable via *findOrderById().*
   * **NOTE: this method does not add the order to any book side,**
   * **so on its own it won't make the order ready to be matched with other orders.**
   * @param order - the order to be stored
   */
  registerOrder(order: IOrder): void;

  /**
   * Removes the order, making it searcheable via *findOrderById().*
   * **NOTE: this method does not remove the order from its book side,**
   * **so on its own it won't prevent the order from being matched with other orders.**
   * @param order - the order to be stored
   */
  deregisterOrder(order: IOrder): void;

  /**
   * Provides access to the book side price bin container.
   * @param containerName - name (scope) of the book side.
   * Allows addressing containers of differend kinds (e.g. limit, stop)
   * and different sides (the sides not necessarily should be binary in general case).
   * @param sortingOrder - determines how the prices are sorted in the book side.
   * If **"ASC"** (ascending), the top price is always the lowest.
   * If **"DESC"** (descending), the top price is always the highest.
   */
  getBinContainer(containerName: string, sortingOrder: 'ASC' | 'DESC'): IBinContainer;
}
