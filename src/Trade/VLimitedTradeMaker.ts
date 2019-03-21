import Big from 'big.js';
import { ILimitOrder, IMarketOrder } from '../Order';
import { TradeMaker } from './TradeMaker';

/**
 * A version of TradeMaker for processing aggressing MarketOrders.
 * Implements volume limiting.
 */
export class VLimitedTradeMaker extends TradeMaker {

  public makeTrade(order: IMarketOrder, oppositeOrder: ILimitOrder) {

    const trade = super.makeTrade(order, oppositeOrder);

    if (order.hasVolumeLimit) {
      const initialTradeQty = order.qty.gte(oppositeOrder.qty) ?
        oppositeOrder.qty.plus(trade.qty) :
        order.qty.plus(trade.qty);
      const tradeVolume = trade.qty.lt(initialTradeQty) ?
        (order.availableVolume as Big) :
        trade.qty.mul(trade.price);

      order.diminishAvailableVolume(tradeVolume);
    }

    return trade;
  }

  protected computeTradeQty(order: IMarketOrder, oppositeOrder: ILimitOrder) {

    const tradePrice = this.computeTradePrice(order, oppositeOrder);
    const initialTradeQty = super.computeTradeQty(order, oppositeOrder);

    if (order.hasVolumeLimit) {

      let availableQty = (order.availableVolume as Big).div(tradePrice);

      if (order.volumeLimitQtyPrecision) {
        availableQty = availableQty
          .div(order.volumeLimitQtyPrecision)
          .round(0, 0)
          .mul(order.volumeLimitQtyPrecision);
      }

      return availableQty.gte(initialTradeQty) ? initialTradeQty : availableQty;
    }

    return initialTradeQty;
  }
}
