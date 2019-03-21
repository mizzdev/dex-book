import Big from 'big.js';
import { IOrder } from '.';

/**
 * Represents a market order. Has no specific price.
 * Allows external control of its volume limits.
 */
export interface IMarketOrder extends IOrder {

  /** If set, Volume Limiting is active for this order */
  readonly hasVolumeLimit: boolean;

  /** Remaining volume available for trading */
  readonly availableVolume?: Big;

  /**
   * If set, forcefully rounds the limited trade quantity to the specified fraction.
   * May be preferable if limited precision is required.
   */
  readonly volumeLimitQtyPrecision?: Big;

  /**
   * Subtracts a certain amount of volume from the currently remaining volume of the order.
   * @param subtrahendVolume - how much of volume should be subtracted
   */
  diminishAvailableVolume(subtrahendVolume: Big): void;
}
