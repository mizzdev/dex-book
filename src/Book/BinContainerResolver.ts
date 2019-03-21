import { IBookControlContext } from '.';
import { EOrderSide } from '../Order';

/**
 * Resolves a BinContainer for the specified book side.
 * Supports scoping the containers using name prefixed.
 * The sorting order for the resolved containers may also be reversed.
 * However, this works only if the resolved container does not exist initially -
 * after it is resolved first time, it is impossible to change the sorting order.
 */
export class BinContainerResolver {

  protected _binContainerPrefix: string = '';
  protected reverseBinSortingOrder: boolean = false;

  get binContainerPrefix() { return this._binContainerPrefix; }
  set binContainerPrefix(prefix: string) { this._binContainerPrefix = prefix; }

  /**
   * Constructor
   * @param prefix - name prefix for container scoping
   * @param reverse - if set, the sorting order will be reversed for newly created containers
   */
  constructor(prefix?: string, reverse?: boolean) {

    if (prefix) {
      this.binContainerPrefix = prefix;
    }

    if (reverse) {
      this.reverseBinSortingOrder = reverse;
    }
  }

  /**
   * Returns the scoped container from the book control context.
   * @param context - control context of the book
   * @param side - book side of the container to be resolved
   */
  public resolve(context: IBookControlContext, side: EOrderSide) {

    const { name, sortingOrder } = this.getBinContainerParams(side);

    return context.getBinContainer(name, sortingOrder);
  }

  protected getBinContainerParams(side: EOrderSide): {
    name: string;
    sortingOrder: 'ASC' | 'DESC'
  } {

    let sortingOrder: 'ASC' | 'DESC';

    switch (side) {
      case EOrderSide.BUY:
        sortingOrder = (this.reverseBinSortingOrder) ? 'ASC' : 'DESC';
        return { name: `${this.binContainerPrefix}BIDS`, sortingOrder };
      case EOrderSide.SELL:
        sortingOrder = (this.reverseBinSortingOrder) ? 'DESC' : 'ASC';
        return { name: `${this.binContainerPrefix}ASKS`, sortingOrder: 'ASC' };
      default:
        throw new Error(`Unrecognized order side: ${side}`);
    }
  }
}
