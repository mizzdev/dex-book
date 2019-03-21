import Big from 'big.js';
import { BookControlContext, BookNotifier, IBook, IBookControlContext } from '.';
import { IOrder, IOrderProcessingResult } from '../Order';

/**
 * The Order Book. Serves as the core part of a trading engine.
 * Responsible for matching incoming orders and generating events about:
 *
 * * order acceptances
 * * order rejections
 * * order state changes, e.g. cancellations, fills
 * * book state changes, e.g. new orders placed into storage and needed to be persisted
 * * matches between orders, namely trades
 *
 * Stores the control context and injects it into every incoming order, allowing orders
 * to operate as strategies/commands over it.
 * Delegates all EventEmitter-related method calls to its context notifier,
 * allowing the outside world to subscribe for events triggered by order executions.
 */
export class Book implements IBook {

  get bid() { return this.context.bid; }
  get ask() { return this.context.ask; }
  get marketPrice() { return this.context.marketPrice; }

  protected context: IBookControlContext;

  constructor() {
    this.context = this.createContext();
  }

  /* istanbul ignore next */
  public addListener(event: string | symbol, listener: (...args: any[]) => void): this {
    this.context.notifier.addListener(event, listener);
    return this;
  }
  /* istanbul ignore next */
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    this.context.notifier.on(event, listener);
    return this;
  }
  /* istanbul ignore next */
  public once(event: string | symbol, listener: (...args: any[]) => void): this {
    this.context.notifier.once(event, listener);
    return this;
  }
  /* istanbul ignore next */
  public prependListener(event: string | symbol, listener: (...args: any[]) => void): this {
    this.context.notifier.prependListener(event, listener);
    return this;
  }
  /* istanbul ignore next */
  public prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this {
    this.context.notifier.prependOnceListener(event, listener);
    return this;
  }
  /* istanbul ignore next */
  public removeListener(event: string | symbol, listener: (...args: any[]) => void): this {
    this.context.notifier.removeListener(event, listener);
    return this;
  }
  /* istanbul ignore next */
  public off(event: string | symbol, listener: (...args: any[]) => void): this {
    this.context.notifier.off(event, listener);
    return this;
  }
  /* istanbul ignore next */
  public removeAllListeners(event?: string | symbol | undefined): this {
    this.context.notifier.removeAllListeners(event);
    return this;
  }
  /* istanbul ignore next */
  public setMaxListeners(n: number): this {
    this.context.notifier.setMaxListeners(n);
    return this;
  }
  /* istanbul ignore next */
  public getMaxListeners(): number {
    return this.context.notifier.getMaxListeners();
  }
  /* istanbul ignore next */
  // tslint:disable-next-line: ban-types
  public listeners(event: string | symbol): Function[] {
    return this.context.notifier.listeners(event);
  }
  /* istanbul ignore next */
  // tslint:disable-next-line: ban-types
  public rawListeners(event: string | symbol): Function[] {
    return this.context.notifier.rawListeners(event);
  }
  /* istanbul ignore next */
  public emit(event: string | symbol, ...args: any[]): boolean {
    return this.context.notifier.emit(event, ...args);
  }
  /* istanbul ignore next */
  public eventNames(): Array<string | symbol> {
    return this.context.notifier.eventNames();
  }
  /* istanbul ignore next */
  public listenerCount(type: string | symbol): number {
    return this.context.notifier.listenerCount(type);
  }

  public importBookData(data: {
    bid?: Big,
    ask?: Big,
    marketPrice?: Big,
    previousMarketPrice?: Big
  }) {
    if (data.bid) { this.context.bid = data.bid; }
    if (data.ask) { this.context.ask = data.ask; }
    if (data.marketPrice) { this.context.marketPrice = data.marketPrice; }
    if (data.previousMarketPrice) { this.context.previousMarketPrice = data.previousMarketPrice; }
  }

  public addOrder(order: IOrder): IOrderProcessingResult {
    return order.inject(this.context);
  }

  public cancelOrder(orderId: string): boolean {

    const { isRegistered, order } = this.context.findOrderById(orderId);

    if (!isRegistered) {
      // Order is not registered
      return false;
    }

    return (order as IOrder).cancel(this.context);
  }

  public importOrder(order: IOrder) {
    return order.import(this.context);
  }

  protected createContext(): IBookControlContext {
    const notifier = new BookNotifier();
    return new BookControlContext(notifier);
  }
}
