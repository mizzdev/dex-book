import { EBookErrorCode } from '../Book/EBookErrorCode';

/**
 * Result of order processing
 */
export interface IOrderProcessingResult {

  /** The ID of the processed order */
  readonly orderId: string;

  /** If set, the order has been accepted, otherwise the order has been rejected */
  readonly isAccepted: boolean;

  /** This field is present only if the order has been rejected */
  readonly errorCode?: EBookErrorCode;
}
