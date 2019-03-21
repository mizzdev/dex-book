import { EventEmitter } from 'events';
import { IOrder, IOrderFill } from '../Order';
import { ITrade } from '../Trade';
import { EBookErrorCode } from './EBookErrorCode';

/**
 * Event-emitting interface for exposing the book events to the outside world.
 */
export interface IBookNotifier extends EventEmitter {

  /**
   * Emits *EBookEvent.ORDER_ACCEPTED* event
   * @param order - the accepted order
   * @param rest - additional parameters to pass into the event
   */
  acceptOrder(order: IOrder, ...rest: any[]): void;

  /**
   * Emits *EBookEvent.ORDER_REJECTED* event
   * @param order - the rejected order
   * @param reason - rejection reason
   * @param rest - additional parameters to pass into the event
   */
  rejectOrder(order: IOrder, reason: EBookErrorCode, ...rest: any[]): void;

  /**
   * Emits *EBookEvent.ORDER_CANCELLED* event
   * @param order - the cancelled order
   * @param reason - optional cancellation reason
   * @param rest - additional parameters to pass into the event
   */
  cancelOrder(order: IOrder, reason?: EBookErrorCode, ...rest: any[]): void;

  /**
   * Emits *EBookEvent.ORDER_PLACED* event
   * @param order - the placed order
   * @param rest - additional parameters to pass into the event
   */
  placeOrder(order: IOrder, ...rest: any[]): void;

  /**
   * Emits *EBookEvent.ORDER_DISPLACED* event
   * @param order - the displaced order
   * @param rest - additional parameters to pass into the event
   */
  displaceOrder(order: IOrder, ...rest: any[]): void;

  /**
   * Emits *EBookEvent.ORDER_FILLED* event
   * @param orderFill - the order fill data
   * @param rest - additional parameters to pass into the event
   */
  fillOrder(orderFill: IOrderFill, ...rest: any[]): void;

  /**
   * Emits *EBookEvent.TRADE* event
   * @param trade - the trade data
   * @param rest - additional parameters to pass into the event
   */
  trade(trade: ITrade, ...rest: any[]): void;
}
