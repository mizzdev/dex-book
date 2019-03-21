import {
  BookControlContext,
  BookNotifier
} from '../../src/Book';

describe('BookControlContext', () => {
  it('should initialize with undefined bid, undefined ask and undefined marketPrice', () => {
    const context = new BookControlContext(new BookNotifier());

    expect(context.bid).toBe(undefined);
    expect(context.ask).toBe(undefined);
    expect(context.marketPrice).toBe(undefined);
  });
});
