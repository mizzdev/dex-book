/**
 * Possible events emitted by the book.
 * String values (aliases) are added for convinience of regular Javascript users.
 */
export enum EBookEvent {

  /**
   * Emitted each time a newcoming order is succesfully accepted.
   * If the order is not rejected, this event is fired **before** everything else.
   *
   * For example, if the order was immediately executed on acceptance, the event order is the following:
   *
   * 1. ORDER_ACCEPTED
   * 2. ORDER_FILLED
   * 3. ORDER_FILLED
   * 4. TRADE
   * 5. ORDER_PLACED
   *
   */
  ORDER_ACCEPTED = 'order-accepted',

  /**
   * Emitted each time a newcoming order is rejected. Rejection reason is appended.
   * If an order is rejected, it won't result in any trades and
   * ORDER_REJECTED will be the only event emitted regarding this order.
   */
  ORDER_REJECTED = 'order-rejected',

  /**
   * Emitted each time an order is cancelled.
   * Cancellation reason is appended **only** if it is not a manual (user-invoked) cancellation.
   */
  ORDER_CANCELLED = 'order-cancelled',

  /**
   * Emitted each time a limit or stop order is placed to the book and ready to be persisted.
   * If a limit order is immediately executed and completely filled on acceptance, this event won't be emitted.
   */
  ORDER_PLACED = 'order-placed',

  /** Emitted each time a limit or stop order is removed from the book and may be removed from the persistent store. */
  ORDER_DISPLACED = 'order-displaced',

  /**
   * Emitted each time an order is executed (filled). Fill data is appended.
   * For each trade 2 (two) ORDER_FILLED events are generated -
   * for the newcoming (aggressing) order and for the matched (resting) order.
   * ORDER_FILLED events always come before TRADE event.
   */
  ORDER_FILLED = 'order-filled',

  /** Emitted each time an order matching results in a trade. Trade data is appended. */
  TRADE = 'trade'
}
