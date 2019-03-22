import Big from 'big.js';
import { EOrderSide, IOrder, IOrderProcessingResult } from '.';
import { BinContainerResolver, EBookErrorCode, IBookControlContext } from '../Book';

import uuidv4 = require('uuid/v4');

/**
 * An abstract class, from which all order types are inherited.
 * The concrete normal order processing strategy should be specified in the
 * *process()* method of the descendant classes.
 * By default, the *process()* method checks for ID_CONFLICT situation in the first place.
 * If it is desired to keep this behavior, the descendant class should refer to *super.process()*
 * before its own actions.
 * The order import strategy should be specified in the *import()* method.
 */
export abstract class Order implements IOrder {

  get id() { return this._id; }
  get side() { return this._side; }

  get qty() { return this._qty; }
  get initialQty() { return this._initialQty; }
  get untouched() { return this.qty.eq(this.initialQty); }

  get stpfId() { return this._stpfId; }

  get shouldSuppressAcceptEvents() { return this._shouldSuppressAcceptEvents; }
  get shouldSuppressPlaceEvents() { return this._shouldSuppressPlaceEvents; }

  get meta() { return this._meta; }
  get orderType() { return this._orderType; }

  get isFullyExecuted() {
    return !this.qty.gt(0);
  }

  /**
   * Returns computed opposite order side.
   * If the order is BUY then SELL is returned and vice versa.
   */
  get oppositeSide(): EOrderSide {

    switch (this.side) {
      case EOrderSide.BUY:
        return EOrderSide.SELL;
      case EOrderSide.SELL:
        return EOrderSide.BUY;
    }
  }

  protected static binContainerPrefix: string = '';
  protected static reverseBinSortingOrder: boolean = false;

  protected abstract _orderType: string;

  protected _qty: Big;
  protected _initialQty: Big;

  protected isStpfViolated: boolean = false;

  protected binContainerResolver: BinContainerResolver;

  private _id: string;
  private _side: EOrderSide;

  private _stpfId?: string;

  private _shouldSuppressAcceptEvents: boolean = false;
  private _shouldSuppressPlaceEvents: boolean = false;

  private _meta: any = {};

  /**
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
   */
  constructor(options: {
    side: 'BUY' | 'SELL';
    qty: Big | string;
    initialQty?: Big | string;
    id?: string;
    stpfId?: string;
    shouldSuppressAcceptEvents?: boolean;
    meta?: any;
  }) {

    if (!EOrderSide[options.side]) {
      throw new Error('Unknown order side');
    }

    this._side = EOrderSide[options.side];

    this._qty = new Big(options.qty);
    this._initialQty = new Big((options.initialQty) ? options.initialQty : options.qty);

    this._id = options.id || this.generateId();

    if (options.stpfId) {
      this._stpfId = options.stpfId;
    }

    if (options.shouldSuppressAcceptEvents) {
      this._shouldSuppressAcceptEvents = options.shouldSuppressAcceptEvents;
    }

    if (options.meta) {
      this._meta = options.meta;
    }

    const constructor = this.constructor as typeof Order;

    this.binContainerResolver = new BinContainerResolver(
      constructor.binContainerPrefix,
      constructor.reverseBinSortingOrder
    );
  }

  public inject(context: IBookControlContext): IOrderProcessingResult {

    const processingResult = this.process(context);

    if (processingResult.isAccepted) {
      context.notifier.acceptOrder(this);
    } else {
      context.notifier.rejectOrder(this, processingResult.errorCode as EBookErrorCode);
    }

    return processingResult;
  }

  public import(context: IBookControlContext): void {

    this._shouldSuppressAcceptEvents = true;
    this._shouldSuppressPlaceEvents = true;
  }

  public cancel(context: IBookControlContext, errorCode?: EBookErrorCode): boolean {

    context.notifier.cancelOrder(this, errorCode);

    return true;
  }

  public diminishQty(subtrahendQty: Big): void {
    this._qty = this._qty.minus(subtrahendQty);
  }

  /**
   * Order processing strategy. Implements the order behaviour once it is added to the book.
   * Uses the book control context API to interact with the book and other orders in it.
   * Any order processing must result either in order acceptance or rejection.
   * As a convention, this method should always return the result of *accept()* or *reject()* call.
   * @param context - the book control context
   */
  protected process(context: IBookControlContext): IOrderProcessingResult {

    const { isRegistered } = context.findOrderById(this.id);

    if (isRegistered) {
      return this.reject(EBookErrorCode.ID_CONFLICT);
    }

    return this.accept();
  }

  /**
   * Helper method to generate order acceptance result.
   * Call this when you finish processing the order from *process()* method body
   * if outcome of your processing is order acceptance.
   */
  protected accept(): IOrderProcessingResult {

    return {
      isAccepted: true,
      orderId: this.id
    };
  }

  /**
   * Helper method to generate order rejection result.
   * Call this immediately when you encounter the order rejection situation from *process()* method body.
   */
  protected reject(errorCode: EBookErrorCode): IOrderProcessingResult {

    return {
      errorCode,
      isAccepted: false,
      orderId: this.id
    };
  }

  /**
   * Immediately fires the ORDER_ACCEPTED book event and supresses
   * any subsequent ORDER_ACCEPTED emits for this order.
   * To avoid inconsistent behaviour, you should never reject this order after you've called this method.
   * @param context - the book control context
   */
  protected markAsAccepted(context: IBookControlContext) {

    context.notifier.acceptOrder(this);
    this._shouldSuppressAcceptEvents = true; // Prevent subsequent accept events for this order
  }

  /**
   * Generates a unique ID. Is used to assign an ID to the order
   * if it has not been provided in options during order instantiation.
   */
  protected generateId(): string {
    return uuidv4();
  }

  /**
   * Checks if the order *stpfId* is the same as an target order has.
   * If *true* is returned - it is considered to be STPF-collision.
   * @param order - target order to check for collision
   */
  protected checkStpfCollision(order: IOrder) {

    if (!this.stpfId) {
      return false;
    }

    return (this.stpfId === order.stpfId);
  }

  /**
   * Returns a BinContainer which the order should stored in if necessary.
   * @param context - the book control context
   */
  protected getSideBinContainer(context: IBookControlContext) {

    return this.binContainerResolver.resolve(context, this.side);
  }
}
