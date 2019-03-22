import { EventEmitter } from 'events';
import { EBookErrorCode, EBookEvent, IBookNotifier } from '.';
import { IOrder, IOrderFill } from '../Order';
import { ITrade } from '../Trade';

export class BookNotifier extends EventEmitter implements IBookNotifier {

  public cancelOrder(order: IOrder, reason?: EBookErrorCode, ...rest: any[]) {
    this.emit(EBookEvent.ORDER_CANCELLED, order, reason, ...rest);
  }
  public placeOrder(order: IOrder, ...rest: any[]) {

    if (order.shouldSuppressPlaceEvents) {
      // Suppress place events for the imported orders
      return;
    }

    this.emit(EBookEvent.ORDER_PLACED, order, ...rest);
  }
  public displaceOrder(order: IOrder, ...rest: any[]) {
    this.emit(EBookEvent.ORDER_DISPLACED, order, ...rest);
  }
  public fillOrder(orderFill: IOrderFill, ...rest: any[]) {
    this.emit(EBookEvent.ORDER_FILLED, orderFill, ...rest);
  }
  public trade(trade: ITrade, ...rest: any[]) {
    this.emit(EBookEvent.TRADE, trade, ...rest);
  }
  public rejectOrder(order: IOrder, reason: EBookErrorCode, ...rest: any[]) {
    this.emit(EBookEvent.ORDER_REJECTED, order, reason, ...rest);
  }
  public acceptOrder(order: IOrder, ...rest: any[]) {

    if (order.shouldSuppressAcceptEvents) {
      // Suppress accept events for the secondary orders
      return;
    }

    this.emit(EBookEvent.ORDER_ACCEPTED, order, ...rest);
  }
}
