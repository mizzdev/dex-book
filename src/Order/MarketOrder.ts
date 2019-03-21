import Big from 'big.js';
import { EOrderSide, ILimitOrder, IMarketOrder, IOrderProcessingResult, Order } from '.';
import { EBookErrorCode, IBookControlContext } from '../Book';
import { VLimitedTradeMaker } from '../Trade';

/**
 * A market order is a buy or sell order to be executed immediately at the current market prices.
 * As long as there are willing sellers and buyers, market orders are filled.
 * Market orders are used when certainty of execution is a priority over the price of execution.
 * A market order is the simplest of the order types. This order type does not allow
 * any control over the price received.
 * The order is filled at the best price available at the relevant time.
 */
export class MarketOrder extends Order implements IMarketOrder {

  get availableVolume() {
    return this._availableVolume;
  }

  get volumeLimitQtyPrecision() {
    return this._volumeLimitQtyPrecision;
  }

  get hasVolumeLimit() {
    return this._hasVolumeLimit;
  }

  protected static binContainerPrefix: string = 'LIMIT.';

  protected _orderType = 'MARKET';

  private _availableVolume?: Big;
  private _volumeLimitQtyPrecision?: Big;
  private _hasVolumeLimit: boolean = false;

  /**
   * A market order is a buy or sell order to be executed immediately at the current market prices.
   * As long as there are willing sellers and buyers, market orders are filled.
   * Market orders are used when certainty of execution is a priority over the price of execution.
   * A market order is the simplest of the order types. This order type does not allow
   * any control over the price received.
   * The order is filled at the best price available at the relevant time.
   *
   * Order constructor accepts an options object.
   *
   * * Orders of different sides are stored and sorted separately.
   * * Everything can be put in *options.meta*. This field will be initialized as {} if not passed through the options.
   *
   * @param options.side - the order side. Determines if the order is to buy or to sell.
   * @param options.qty - order quantity to be traded
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

  public diminishAvailableVolume(subtrahendVolume: Big): void {

    if (!this.hasVolumeLimit) {
      throw new Error('Cannot diminish available volume: the order does not have volume limit');
    }

    if (!this.availableVolume) {
      throw new Error('Cannot diminish available volume: limit already exceeded');
    }

    this._availableVolume = (this._availableVolume as Big).minus(subtrahendVolume);
  }

  protected process(context: IBookControlContext): IOrderProcessingResult {

    const result = super.process(context);

    if (!result.isAccepted) {
      return this.reject(result.errorCode as EBookErrorCode);
    }

    const { oppositePrice } = this.getOppositeSideData(context);

    if (!oppositePrice) {
      return this.reject(EBookErrorCode.NO_LIQUIDITY);
    }

    const tradeMaker = new VLimitedTradeMaker(context);

    let isMatched: boolean;
    let oppositeOrder;

    do {
      ({ isMatched, order: oppositeOrder } = this.match(context));

      if (isMatched) {
        this.markAsAccepted(context);
        tradeMaker.makeTrade(this, oppositeOrder as ILimitOrder);
      }

      if (this.hasVolumeLimit && (this.availableVolume as Big).eq(0)) {
        this.cancel(context, EBookErrorCode.VOLUME_LIMIT_EXCEEDED);
        return this.accept();
      }
    } while (isMatched && !this.isFullyExecuted);

    if (this.isStpfViolated) {

      if (!this.untouched) {
        return this.accept();
      }

      return this.reject(EBookErrorCode.WASH_TRADE_DENIED);
    }

    if (!this.isFullyExecuted) {
      this.markAsAccepted(context);
      this.cancel(context, EBookErrorCode.NO_LIQUIDITY);
    }

    return this.accept();
  }

  /**
   * Returns the opposite book side BinContainer and its top price.
   * @param context - the book control context
   */
  private getOppositeSideData(context: IBookControlContext) {

    const oppositeBinContainer = this.binContainerResolver.resolve(context, this.oppositeSide);

    let oppositePrice;

    switch (this.side) {
      case EOrderSide.BUY:
        oppositePrice = context.ask;
        break;
      case EOrderSide.SELL:
        oppositePrice = context.bid;
        break;
      default:
        throw new Error(`Unrecognized order side: ${this.side}`);
    }

    return {
      oppositeBinContainer,
      oppositePrice
    };
  }

  /**
   * Implementation of limit order matching algorithm.
   * Returns the best (according to price-time) order from the opposite book side.
   * Prevents a match in case of STPF-collision.
   * @param context - the book control context
   */
  private match(context: IBookControlContext): { isMatched: boolean; order?: ILimitOrder } {

    const { oppositeBinContainer, oppositePrice } = this.getOppositeSideData(context);

    if (!oppositePrice) {
      // The opposite book has no orders; Matching is not possible
      return { isMatched: false };
    }

    const oppositeOrder =  oppositeBinContainer.pickTopOrder().order as ILimitOrder;

    const isWashOrder = this.checkStpfCollision(oppositeOrder);

    if (isWashOrder) {
      this.isStpfViolated = true;
      this.cancel(context, EBookErrorCode.WASH_TRADE_DENIED);
      return { isMatched: false };
    }

    return { isMatched: true, order: oppositeOrder };
  }
}
