import { Big } from 'big.js';
import { EOrderSide, IOrderProcessingResult } from '.';
import { EBookErrorCode, IBookControlContext } from '../Book';

/**
 * Represents any order regardless of its type.
 * Contains shared fields for all of the order types.
 * Exposes basic state control methods.
 */
export interface IOrder {

  /** The ID of the order. Should be unique. */
  readonly id: string;

  /** If set, STPF is active for this order */
  readonly stpfId?: string;

  /** The order side. Determines if the order is to buy or to sell. */
  readonly side: EOrderSide;

  /** Remaining unexecuted order quantity */
  readonly qty: Big;

  /** Initial order quantity */
  readonly initialQty: Big;

  /** If set, no ORDER_ACCEPTED events will be fired for this order */
  readonly shouldSuppressAcceptEvents: boolean;

  /** If set, no ORDER_PLACED events will be fired for this order */
  readonly shouldSuppressPlaceEvents: boolean;

  /** The order metadata. Does not affect the order book operation. Everything can be put here. */
  readonly meta: any;

  /**
   * A string descriptor unique to the order type.
   * Helps in determining the order type without using instanceof.
   */
  readonly orderType: string;

  /**
   * Grants the order control over the book context API, triggering acceptance/rejection checks.
   * @param context - the book context
   */
  inject(context: IBookControlContext): IOrderProcessingResult;

  /**
   * Grants the order control over the book context API, bypassing acceptance/rejection checks.
   * May be used for loading already persisted orders into a freshly started book.
   * Should not used for normal order operations.
   * @param context - the book context
   */
  import(context: IBookControlContext): void;

  /**
   * Cancels the order
   * @param context - the book context
   * @param errorCode - leave unset for manual cancellations
   */
  cancel(context: IBookControlContext, errorCode?: EBookErrorCode): boolean;

  /**
   * Subtracts a certain quantity from the currently remaining unexecuted quantity of the order.
   * @param subtrahendQty - how much of quantity should be subtracted
   */
  diminishQty(subtrahendQty: Big): void;
}
