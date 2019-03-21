import Big from 'big.js';
import { Order } from '.';

import { EOrderSide, ILimitOrder, IOrderProcessingResult } from '.';
import { EBookErrorCode, IBookControlContext } from '../Book';
import { TradeMaker } from '../Trade';

/**
 * A limit order is an order placed to execute a buy or sell transaction at a set number of shares
 * and at a specified limit price or better. It is a take-profit order placed to buy or sell
 * a set amount of a financial instrument at a specified price or better.
 * This is one of the most basic and commonly used types of orders on the exchanges.
 */
export class LimitOrder extends Order implements ILimitOrder {

  get price() { return this._price; }

  protected static binContainerPrefix: string = 'LIMIT.';

  protected _orderType = 'LIMIT';

  private _price: Big;

  /**
   * A limit order is an order placed to execute a buy or sell transaction at a set number of shares
   * and at a specified limit price or better. It is a take-profit order placed to buy or sell
   * a set amount of a financial instrument at a specified price or better.
   * This is one of the most basic and commonly used types of orders on the exchanges.
   *
   * Order constructor accepts an options object.
   *
   * * Orders of different sides are stored and sorted separately.
   * * Everything can be put in *options.meta*. This field will be initialized as {} if not passed through the options.
   *
   * @param options.side - the order side. Determines if the order is to buy or to sell.
   * @param options.qty - order quantity to be traded
   * @param options.price - limit price of the order
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
    id?: string;
    stpfId?: string;
    shouldSuppressAcceptEvents?: boolean;
    meta?: any;
  }) {
    super(options);

    this._price = new Big(options.price);
  }

  public cancel(context: IBookControlContext, errorCode?: EBookErrorCode): boolean {

    const { isRegistered } = context.findOrderById(this.id);

    if (isRegistered) {
      this.removeFromBook(context);
    }

    super.cancel(context, errorCode);

    return isRegistered;
  }

  /**
   * Removes the order from the relevant BinContainer of the order book side.
   * Generates ORDER_DISPLACED event on removal.
   * @param context - the book control context
   */
  public removeFromBook(context: IBookControlContext) {

    context.notifier.displaceOrder(this);

    const binContainer = this.getSideBinContainer(context);
    binContainer.removeOrder(this.price, this);

    context.deregisterOrder(this);

    this.setSidePrice(context, binContainer.pickTopPrice().price);
  }

  public import(context: IBookControlContext) {
    this.placeIntoBook(context);
  }

  protected process(context: IBookControlContext): IOrderProcessingResult {

    const result = super.process(context);

    if (!result.isAccepted) {
      return this.reject(result.errorCode as EBookErrorCode);
    }

    const tradeMaker = new TradeMaker(context);

    let isMatched: boolean;
    let oppositeOrder;

    do {
      ({ isMatched, order: oppositeOrder } = this.match(context));

      if (isMatched) {
        this.markAsAccepted(context);
        tradeMaker.makeTrade(this, oppositeOrder as ILimitOrder);
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
      this.placeIntoBook(context);
    }

    return this.accept();
  }

  /**
   * Places the order into the BinContainer of the book side which the order should belong to.
   * Generates ORDER_PLACED event on insertion.
   * @param context - the book control context
   */
  private placeIntoBook(context: IBookControlContext) {

    const binContainer = this.getSideBinContainer(context);

    binContainer.insertOrder(this.price, this);

    context.registerOrder(this);
    this.setSidePrice(context, binContainer.pickTopPrice().price);

    context.notifier.placeOrder(this);
  }

  /**
   * Sets the book price (bid or ask) depending on the current order side
   * @param context - the book control context
   * @param price - target price to set
   */
  private setSidePrice(context: IBookControlContext, price?: Big) {

    switch (this.side) {
      case EOrderSide.BUY:
        context.bid = price;
        break;
      case EOrderSide.SELL:
        context.ask = price;
        break;
    }
  }

  /**
   * Returns the opposite book side BinContainer and whether
   * current order limit price intersects with the opposite book top price.
   * @param context - the book control context
   */
  private getOppositeSideData(context: IBookControlContext) {

    const oppositeBinContainer = this.binContainerResolver.resolve(context, this.oppositeSide);

    let oppositePrice;
    let isIntesected: boolean = false;

    switch (this.side) {
      case EOrderSide.BUY:
        oppositePrice = context.ask;
        isIntesected = (oppositePrice) ? (this.price.gte(oppositePrice)) : false;
        break;
      case EOrderSide.SELL:
        oppositePrice = context.bid;
        isIntesected = (oppositePrice) ? (this.price.lte(oppositePrice)) : false;
        break;
    }

    return {
      isIntesected,
      oppositeBinContainer
    };
  }

  /**
   * Implementation of limit order matching algorithm.
   * Returns the best (according to price-time) order from the opposite book side.
   * Prevents a match in case of STPF-collision.
   * @param context - the book control context
   */
  private match(context: IBookControlContext): { isMatched: boolean; order?: ILimitOrder } {

    const {
      oppositeBinContainer,
      isIntesected
    } = this.getOppositeSideData(context);

    if (!isIntesected) {
      // The order does not intersect opposite book top; Matching is not possible
      return { isMatched: false };
    }

    const oppositeOrder: ILimitOrder =  oppositeBinContainer.pickTopOrder().order as ILimitOrder;

    const isWashOrder = this.checkStpfCollision(oppositeOrder);

    if (isWashOrder) {
      this.isStpfViolated = true;
      this.cancel(context, EBookErrorCode.WASH_TRADE_DENIED);
      return { isMatched: false };
    }

    return { isMatched: true, order: oppositeOrder };
  }
}
