import { Book, EBookErrorCode, LimitOrder, StopMarketOrder } from '../../../src';

describe('Integration test suite: 20190303_stop_market_price_too_low', () => {

  let book: Book;

  beforeEach(() => {
    book = new Book();

    // Initializing the book with a fake trade so market price will be set
    book.addOrder(new LimitOrder({
      price: '1',
      qty: '1',
      side: 'BUY'
    }));
    book.addOrder(new LimitOrder({
      price: '1',
      qty: '1',
      side: 'SELL'
    }));
  });

  test('Stop-market buy order should be rejected if stop price is lower than current market price', () => {

    const orderId = 'foo';

    let orderProcessingResult;

    orderProcessingResult = book.addOrder(new StopMarketOrder({
      id: orderId,
      price: '0.5',
      qty: '3',
      side: 'BUY'
    }));
    expect(orderProcessingResult.isAccepted).toBe(false);
    expect(orderProcessingResult.errorCode).toBe(EBookErrorCode.STOP_PRICE_TOO_LOW);
  });

  test('Bid, ask and market prices should change correctly during the test', () => {

    const orderId = 'foo';

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('undefined');
    expect(String(book.marketPrice)).toBe('1');

    book.addOrder(new StopMarketOrder({
      id: orderId,
      price: '0.5',
      qty: '3',
      side: 'BUY'
    }));

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('undefined');
    expect(String(book.marketPrice)).toBe('1');
  });

  test('"order-rejected" event should be emitted', () => {

    const listener = jest.fn();

    const orderId = 'foo';

    book.on('order-rejected', listener);

    book.addOrder(new StopMarketOrder({
      id: orderId,
      price: '0.5',
      qty: '3',
      side: 'BUY'
    }));

    expect(listener.mock.calls.length).toBe(1);
    expect(listener.mock.calls[0][0].id).toBe(orderId);
    expect(listener.mock.calls[0][1]).toBe(EBookErrorCode.STOP_PRICE_TOO_LOW);
  });
});
