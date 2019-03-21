import Big from 'big.js';
import { LimitOrder, StopOrder } from '.';
import { IBookControlContext } from '../Book';

/**
 * A stop–limit order is an order to buy or sell a stock
 * that combines the features of a stop order and a limit order.
 * Once the stop price is reached, a stop-limit order becomes a limit order
 * that will be executed at a specified price (or better).
 */
export class StopLimitOrder extends StopOrder {

  get limitPrice() {
    return this._limitPrice;
  }

  protected _orderType = 'STOP_LIMIT';

  private _limitPrice: Big;

  /**
   * A stop–limit order is an order to buy or sell a stock
   * that combines the features of a stop order and a limit order.
   * Once the stop price is reached, a stop-limit order becomes a limit order
   * that will be executed at a specified price (or better).
   *
   * Order constructor accepts an options object.
   *
   * * Orders of different sides are stored and sorted separately.
   * * Everything can be put in *options.meta*. This field will be initialized as {} if not passed through the options.
   *
   * @param options.side - the order side. Determines if the order is to buy or to sell.
   * @param options.qty - order quantity to be traded
   * @param options.price - stop price of the order
   * @param options.limitPrice - limit price of the **converted** order
   * @param options.initialQty - initial order quantity. Set this only if this order was already persisted somewhere.
   * @param options.id - the ID of the order. Should be unique. If not set, it will be a generated UUID.
   * @param options.stpfId - if set, STPF is active for this order
   * @param options.shouldSuppressAcceptEvents - if set, no ORDER_ACCEPTED events will be fired for this order
   * @param options.meta - the order metadata. Does not affect the order book operation.
   */
  constructor(options: {
    side: 'BUY' | 'SELL';
    qty: Big | string;
    price: Big | string;
    limitPrice: Big | string;
    id?: string;
    stpfId?: string;
    shouldSuppressAcceptEvents?: boolean;
    meta?: any;
  }) {
    super(options);

    this._limitPrice = new Big(options.limitPrice);
  }

  public convert(context: IBookControlContext) {

    super.convert(context);

    const convertedOrderOptions = {
      side: this.side,
      qty: this.qty,
      price: this.limitPrice,
      id: this.id,
      stpfId: this.stpfId,
      shouldSuppressAcceptEvents: true,
      meta: this.meta
    };

    const convertedOrder = new LimitOrder(convertedOrderOptions);
    convertedOrder.inject(context);
  }
}
