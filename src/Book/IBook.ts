import Big from 'big.js';
import { EventEmitter } from 'events';
import { IOrder, IOrderProcessingResult } from '../Order';

/**
 * The Order Book. Serves as the core part of a trading engine.
 * Responsible for matching incoming orders and generating events about:
 * * order acceptances
 * * order rejections
 * * order state changes, e.g. cancellations, fills
 * * book state changes, e.g. new orders placed into storage and needed to be persisted
 * * matches between orders, namely trades
 */
export interface IBook extends EventEmitter {

  /** The top price of the bid (buy) book side */
  readonly bid?: Big;

  /** The top price of the ask (sell) book side */
  readonly ask?: Big;

  /** The price of the last trade */
  readonly marketPrice?: Big;

  /**
   * Adds an order to the book an starts processing it immediately.
   * Processing algorithm (strategy) is a part of the order implementation itself.
   * It is adviced to use this method to process new orders coming from end users or customers.
   * @param order - the order to be processed
   */
  addOrder(order: IOrder): IOrderProcessingResult;

  /**
   * Manually cancels the order by its *id*.
   * Only makes sense for non-instant orders, like limit or stop orders.
   * Returns a flag whether the cancellation has been successful.
   * It is adviced to use this method to process order cancellation requests from end users or customers.
   * @param orderId - the *id* of the order to be canceled.
   */
  cancelOrder(orderId: string): boolean;

  /**
   * Adds an order to the book **bypassing validity checks**, without any need to accept or reject it.
   * Any order, added using this method, **is not matched with other orders during insertion**.
   * This method is intended to be used only for loading the orders from a backup persistent storage.
   * @param order - the order to be imported
   */
  importOrder(order: IOrder): void;

  /**
   * Allows to set book parameters manually.
   * This method is intended to be used only for loading the book parameters
   * from a backup persistent storage along with the orders.
   * **If these parameters are not in sync with the actual orders, loaded, for example,**
   * **using *importOrder()*, invokation of this method could lead to data inconsistency in the book**
   * **with unpredicted consequences occuring during the newcoming order processing.**
   * @param data - book data to be imported
   * @param data.bid - new book bid
   * @param data.ask - new book ask
   * @param data.marketPrice - new book market price
   * @param data.previousMarketPrice - new book market price before the last trade
   */
  importBookData(data: {
    bid?: Big,
    ask?: Big,
    marketPrice?: Big,
    previousMarketPrice?: Big
  }): void;
}
