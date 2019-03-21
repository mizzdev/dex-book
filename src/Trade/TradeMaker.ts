import Big from 'big.js';
import { ITrade } from '.';
import { BinContainerResolver, IBookControlContext } from '../Book';
import { EOrderSide, ILimitOrder, IOrder, IStopOrder } from '../Order';

/**
 * Responsible for generating trades from a pair of matched orders.
 */
export class TradeMaker {

  protected stopBinContainerResolver: BinContainerResolver;

  private context: IBookControlContext;

  /**
   * The constructor function
   * @param context - the book control context
   */
  constructor(context: IBookControlContext) {
    this.context = context;

    this.stopBinContainerResolver = new BinContainerResolver('STOP.');
  }

  /**
   * Generates a trade from a newcoming (aggressing) order and its matched opposing (resting) order.
   * Generates ORDER_FILLED and TRADE events.
   * Returns a trade data object.
   * @param order - the newcoming (aggressing) order
   * @param oppositeOrder - the opposing (resting) order
   */
  public makeTrade(order: IOrder, oppositeOrder: ILimitOrder): ITrade {

    const tradePrice = this.computeTradePrice(order, oppositeOrder);
    const tradeQty = this.computeTradeQty(order, oppositeOrder);

    const orderFullExecution = tradeQty.gte(order.qty);
    const oppositeOrderFullExecution = tradeQty.gte(oppositeOrder.qty);

    this.context.notifier.fillOrder({
      order,
      oppositeOrder,
      price: tradePrice,
      qty: tradeQty,
      isFull: orderFullExecution
    });
    this.context.notifier.fillOrder({
      order: oppositeOrder,
      oppositeOrder: order,
      price: tradePrice,
      qty: tradeQty,
      isFull: oppositeOrderFullExecution
    });

    const trade: ITrade = {
      order,
      oppositeOrder,
      price: tradePrice,
      qty: tradeQty
    };

    this.context.notifier.trade(trade);

    oppositeOrder.diminishQty(tradeQty);
    order.diminishQty(tradeQty);

    if (oppositeOrderFullExecution) {
      oppositeOrder.removeFromBook(this.context);
    }

    this.context.previousMarketPrice = this.context.marketPrice;
    this.context.marketPrice = tradePrice;

    this.traverseStopBook(trade);

    return trade;
  }

  /**
   * Checks the stop orders placed in the book for intersection with the current market price.
   * If intersection is detected this method initiates stop order conversion.
   * @param trade - the trade data object
   */
  protected traverseStopBook(trade: ITrade) {

    if (!this.context.previousMarketPrice) {
      // No sense to traverse stop orders on the first market trade
      return;
    }

    if ((this.context.marketPrice as Big).eq(this.context.previousMarketPrice as Big)) {
      // No sense to detect price level breakthrough without price change
      return;
    }

    const stopBinContainer = this.stopBinContainerResolver.resolve(this.context, trade.order.side);

    let breakthrough;

    do {

      const { hasTop, order: binContainerTop } = stopBinContainer.pickTopOrder();

      if (!hasTop) {
        break;
      }

      const stopOrder = binContainerTop as IStopOrder;

      breakthrough = false;

      switch (trade.order.side) {
        case EOrderSide.BUY:
          breakthrough = (this.context.marketPrice as Big).gt(stopOrder.price);
          break;
        case EOrderSide.SELL:
          breakthrough = (this.context.marketPrice as Big).lt(stopOrder.price);
          break;
      }

      if (breakthrough) {
        stopOrder.convert(this.context);
      }

    } while (breakthrough);
  }

  protected computeTradePrice(order: IOrder, oppositeOrder: ILimitOrder) {
    return oppositeOrder.price;
  }

  protected computeTradeQty(order: IOrder, oppositeOrder: ILimitOrder) {
    return order.qty.gte(oppositeOrder.qty) ?
      oppositeOrder.qty : // The order is partially or fully filled; Opposite order is fully filled
      order.qty; // The order is fully filled; Opposite order is partially filled
  }
}
