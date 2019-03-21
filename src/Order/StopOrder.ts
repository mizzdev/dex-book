import Big from 'big.js';
import { EOrderSide, IOrderProcessingResult, IStopOrder, Order } from '.';
import { EBookErrorCode, IBookControlContext } from '../Book';

/**
 * A stop order, also referred to as a stop-loss order,
 * is an order to buy or sell a stock once the price of the stock reaches
 * a specified price, known as the stop price.
 * A *buy–stop* order is entered at a stop price above the current market price.
 * Investors generally use a buy stop order to limit a loss or to protect
 * a profit on a stock that they have sold short.
 * A *sell–stop* order is entered at a stop price below the current market price.
 * Investors generally use a sell–stop order to limit a loss or to protect a profit on a stock that they own.
 * When the stop price is reached, and the stop order becomes an order of another type.
 * The conversion procedure is implemented in the *convert()* method.
 */
export abstract class StopOrder extends Order implements IStopOrder {

  get price() { return this._price; }

  protected static binContainerPrefix: string = 'STOP.';
  protected static reverseBinSortingOrder: boolean = true;

  private _price: Big;

  /**
   * Order constructor accepts an options object.
   *
   * * Orders of different sides are stored and sorted separately.
   * * Everything can be put in *options.meta*. This field will be initialized as {} if not passed through the options.
   *
   * @param options.side - the order side. Determines if the order is to buy or to sell.
   * @param options.qty - order quantity to be traded
   * @param options.price - stop price of the order
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

  public import(context: IBookControlContext) {
    this.placeIntoBook(context);
  }

  public convert(context: IBookControlContext) {
    this.removeFromBook(context);
  }

  /**
   * Removes the order from the relevant BinContainer of the order book side.
   * Generates ORDER_DISPLACED event on removal.
   * @param context - the book control context
   */
  protected removeFromBook(context: IBookControlContext) {

    context.notifier.displaceOrder(this);

    const binContainer = this.getSideBinContainer(context);
    binContainer.removeOrder(this.price, this);

    context.deregisterOrder(this);
  }

  protected process(context: IBookControlContext): IOrderProcessingResult {

    const result = super.process(context);

    if (!result.isAccepted) {
      return result;
    }

    if (!context.marketPrice) {
      return this.reject(EBookErrorCode.NO_TRADES);
    }

    const immediateExecution = this.checkImmediateExecution(context);

    if (immediateExecution.isImmediate) {
      return this.reject(immediateExecution.errorCode as EBookErrorCode);
    }

    this.markAsAccepted(context);
    this.placeIntoBook(context);

    return this.accept();
  }

  /**
   * Checks if placing the stop order will lead to its immediate execution.
   * @param context - the book control context
   */
  private checkImmediateExecution(context: IBookControlContext): {
    isImmediate: boolean,
    errorCode?: EBookErrorCode
  } {

    let immediateExecution;
    let errorCode;

    switch (this.side) {
      case EOrderSide.BUY:
        immediateExecution = this.price.lt(context.marketPrice as Big);
        errorCode = EBookErrorCode.STOP_PRICE_TOO_LOW;
        break;
      case EOrderSide.SELL:
        immediateExecution = this.price.gt(context.marketPrice as Big);
        errorCode = EBookErrorCode.STOP_PRICE_TOO_HIGH;
        break;
    }

    if (immediateExecution) {
      return { isImmediate: true, errorCode };
    }

    return { isImmediate: false };
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
    context.notifier.placeOrder(this);
  }
}
