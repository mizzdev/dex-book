import { Big } from 'big.js';
import { BinContainer, IBinContainer, IBookControlContext, IBookNotifier } from '.';
import { IOrder } from '../Order';
import { IDictionary } from '../Util';

export class BookControlContext implements IBookControlContext {
  private _bid?: Big;
  private _ask?: Big;
  private _marketPrice?: Big;
  private _previousMarketPrice?: Big;

  private _notifier: IBookNotifier;

  private orders: IDictionary<IOrder> = {};
  private binContainers: IDictionary<IBinContainer> = {};

  constructor(notifier: IBookNotifier) {
    this._notifier = notifier;
  }

  get bid() { return this._bid; }
  set bid(value: Big | undefined) { this._bid = value; }

  get ask()  { return this._ask; }
  set ask(value: Big | undefined) { this._ask = value; }

  get marketPrice()  { return this._marketPrice; }
  set marketPrice(value: Big | undefined) { this._marketPrice = value; }

  get previousMarketPrice()  { return this._previousMarketPrice; }
  set previousMarketPrice(value: Big | undefined) { this._previousMarketPrice = value; }

  get notifier() { return this._notifier; }

  public findOrderById(orderId: string): { isRegistered: boolean; order?: IOrder } {

    if (!this.orders[orderId]) {
      return { isRegistered: false };
    }

    return {
      isRegistered: true,
      order: this.orders[orderId]
    };
  }

  public registerOrder(order: IOrder): void {
    this.orders[order.id] = order;
  }

  public deregisterOrder(order: IOrder): void {
    delete this.orders[order.id];
  }

  /**
   * Provides access to the book side price bin container.
   * If container with the specified name does not exist, this method creates one and stores it
   * for the subsequent calls with the same *containerName*, always referring to the same container.
   * However, *sortingOrder* is only set once at container creation.
   * For the subsequent calls *sortingOrder* parameter is ignored.
   * @param containerName - name (scope) of the book side.
   * Allows addressing containers of differend kinds (e.g. limit, stop)
   * and different sides (the sides not necessarily should be binary in general case).
   * @param sortingOrder - determines how the prices are sorted in the book side.
   * If **"ASC"** (ascending), the top price is always the lowest.
   * If **"DESC"** (descending), the top price is always the highest.
   */
  public getBinContainer(containerName: string, sortingOrder: 'ASC' | 'DESC'): IBinContainer {

    const binContainer = this.binContainers[containerName];

    if (binContainer) {
      return binContainer;
    }

    return this.binContainers[containerName] = new BinContainer(sortingOrder);
  }
}
