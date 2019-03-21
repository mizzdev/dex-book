/**
 * Operational error codes. Any order can be rejected and/or cancelled with one of the specified codes.
 */
export enum EBookErrorCode {

  /**
   * Occurs when the *id* of the newcoming order has been already used for
   * some other order placed into the book.
   * Orders can only be rejected with this error code;
   * once an order has been accepted, it will never be cancelled with this error code.
   * However, the newcoming orders with the same id are guaranteed to be rejected with this error code.
   */
  ID_CONFLICT,

  /**
   * Occurs when there are no limit orders in the opposite book side to match with the market order.
   * Market orders can be rejected with this code if the opposite book side is empty initially,
   * or cancelled in the middle of processing if all of the opposite book liquidity (opposite orders)
   * has been matched and traded during execution of the current market order and there is still some
   * quantity left to be filled for it.
   */
  NO_LIQUIDITY,

  /**
   * Occurs on trying to place a stop order
   * while there is no trade history in the book, hence no market price.
   * It is mandatory to have at least one trade performed in the book so
   * the market price will be established.
   * Orders can only be rejected with this error code;
   * once an order has been accepted, it will never be cancelled with this error code.
   */
  NO_TRADES,

  /**
   * Occurs on trying to place stop **SELL** order
   * above the current market price.
   * This is forbidden because accepting such order would lead to its immediate execution.
   * Orders can only be rejected with this error code;
   * once an order has been accepted, it will never be cancelled with this error code.
   */
  STOP_PRICE_TOO_HIGH,

  /**
   * Occurs on trying to place stop **BUY** order
   * below the current market price.
   * This is forbidden because accepting such order would lead to its immediate execution.
   * Orders can only be rejected with this error code;
   * once an order has been accepted, it will never be cancelled with this error code.
   */
  STOP_PRICE_TOO_LOW,

  /**
   * Occurs when the order is matched with an opposite order possessing the same *stpfId*.
   * Blocks subsequent order execution as intended to prevent self-trade.
   * This error code can only occur for orders with *STPF* enabled.
   * An STPF-violating order can be rejected with this code if the very first match of this order
   * detected an opposite order with the same *stpfId*, meaning the newcoming order generated no
   * trades prior to the violation,
   * otherwise (there are already some trades involving this order) the order will be
   * cancelled with this error code.
   */
  WASH_TRADE_DENIED,

  /**
   * Occurs for volume-limited market orders which had to be cancelled as their *availableVolume*
   * went to zero.
   * Orders can only be cancelled with this error code;
   * this check is never made before the order is accepted.
   */
  VOLUME_LIMIT_EXCEEDED,

  /**
   * Custom error code for user-defined errors.
   * Never occurs in default order implementations - it is meant to be triggered from custom order
   * implementations, for example, inherited from *Order*. The error parameters can be passed in two ways:
   * * arbitrary data may be attached to *meta* field of the order
   * * arbitrary data may be passed as rest parameters to IBookNotifier methods
   */
  CUSTOM
}
