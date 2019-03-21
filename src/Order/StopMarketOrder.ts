import Big from 'big.js';
import { MarketOrder, StopOrder } from '.';
import { IBookControlContext } from '../Book';

/**
 * A stop order, also referred to as a stop-loss order,
 * is an order to buy or sell a stock once the price of the stock reaches
 * a specified price, known as the stop price.
 * When the stop price is reached, the stop market order becomes a market order.
 * This means the trade will definitely be executed, but not necessarily at or near the stop price.
 */
export class StopMarketOrder extends StopOrder {

  get availableVolume() {
    return this._availableVolume;
  }

  get volumeLimitQtyPrecision() {
    return this._volumeLimitQtyPrecision;
  }

  get hasVolumeLimit() {
    return this._hasVolumeLimit;
  }

  protected _orderType = 'STOP_MARKET';

  private _availableVolume?: Big;
  private _volumeLimitQtyPrecision?: Big;
  private _hasVolumeLimit: boolean = false;

  /**
   * A stop order, also referred to as a stop-loss order,
   * is an order to buy or sell a stock once the price of the stock reaches
   * a specified price, known as the stop price.
   * When the stop price is reached, the stop market order becomes a market order.
   * This means the trade will definitely be executed, but not necessarily at or near the stop price.
   *
   * Order constructor accepts an options object.
   *
   * * Orders of different sides are stored and sorted separately.
   * * Everything can be put in *options.meta*. This field will be initialized as {} if not passed through the options.
   * * *options.availableVolume* and *options.volumeLimit* will **NOT** affect the stop order behaviour itself,
   *     but will apply to the **converted** order.
   *
   * @param options.side - the order side. Determines if the order is to buy or to sell.
   * @param options.qty - order quantity to be traded
   * @param options.price - stop price of the order
   * @param options.initialQty - initial order quantity. Set this only if this order was already persisted somewhere.
   * @param options.id - the ID of the order. Should be unique. If not set, it will be a generated UUID.
   * @param options.stpfId - if set, STPF is active for this order
   * @param options.shouldSuppressAcceptEvents - if set, no ORDER_ACCEPTED events will be fired for this order
   * @param options.meta - the order metadata. Does not affect the order book operation.
   * @param options.availableVolume - if provided, enables Volume Limiting with the specified max available volume
   * @param options.volumeLimitQtyPrecision - only makes sense if Volume Limiting is enabled
   *     (*options.availableVolume* provided).
   *     Rounds the trade quantity to the fixed precision if Volume Limiting is triggered.
   *     Examples: "1e-8", "0.00000001"
   */
  constructor(options: {
    side: 'BUY' | 'SELL';
    qty: Big | string;
    price: Big | string;
    id?: string;
    stpfId?: string;
    shouldSuppressAcceptEvents?: boolean;
    meta?: any;
    availableVolume?: Big | string;
    volumeLimitQtyPrecision?: Big | string;
  }) {
    super(options);

    if (options.availableVolume) {
      this._hasVolumeLimit = true;
      this._availableVolume = new Big(options.availableVolume);

      if (options.volumeLimitQtyPrecision) {
        this._volumeLimitQtyPrecision = new Big(options.volumeLimitQtyPrecision);
      }
    }
  }

  public convert(context: IBookControlContext) {

    super.convert(context);

    const convertedOrderOptions = {
      side: this.side,
      qty: this.qty,
      id: this.id,
      stpfId: this.stpfId,
      shouldSuppressAcceptEvents: true,
      meta: this.meta,
      availableVolume: this.availableVolume,
      volumeLimitQtyPrecision: this.volumeLimitQtyPrecision
    };

    const convertedOrder = new MarketOrder(convertedOrderOptions);
    convertedOrder.inject(context);
  }
}
