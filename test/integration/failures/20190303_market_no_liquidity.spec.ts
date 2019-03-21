import { Book, EBookErrorCode, LimitOrder, MarketOrder } from '../../../src';

describe('Integration test suite: 20190303_market_no_liquidity', () => {

  let book: Book;

  beforeEach(() => {
    book = new Book();
  });

  test('Market order should be rejected if there is no liquidity(orders) in the opposite limit order book', () => {

    const orderId = 'foo';

    let orderProcessingResult;

    orderProcessingResult = book.addOrder(new LimitOrder({
      price: '2',
      qty: '2',
      side: 'SELL',
    }));
    expect(orderProcessingResult.isAccepted).toBe(true);

    orderProcessingResult = book.addOrder(new LimitOrder({
      price: '1',
      qty: '2',
      side: 'SELL'
    }));
    expect(orderProcessingResult.isAccepted).toBe(true);

    orderProcessingResult = book.addOrder(new MarketOrder({
      id: orderId,
      qty: '3',
      side: 'SELL'
    }));
    expect(orderProcessingResult.isAccepted).toBe(false);
    expect(orderProcessingResult.errorCode).toBe(EBookErrorCode.NO_LIQUIDITY);
  });

  test('Bid, ask and market prices should change correctly during the test', () => {

    const orderId = 'foo';

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('undefined');
    expect(String(book.marketPrice)).toBe('undefined');

    book.addOrder(new LimitOrder({
      price: '2',
      qty: '2',
      side: 'SELL',
    }));

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('2');
    expect(String(book.marketPrice)).toBe('undefined');

    book.addOrder(new LimitOrder({
      price: '1',
      qty: '2',
      side: 'SELL'
    }));

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('1');
    expect(String(book.marketPrice)).toBe('undefined');

    book.addOrder(new MarketOrder({
      id: orderId,
      qty: '3',
      side: 'SELL'
    }));

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('1');
    expect(String(book.marketPrice)).toBe('undefined');
  });

  test('"order-rejected" event should be emitted', () => {

    const listener = jest.fn();

    const orderId = 'foo';

    book.on('order-rejected', listener);

    book.addOrder(new LimitOrder({
      price: '2',
      qty: '2',
      side: 'SELL',
    }));

    book.addOrder(new LimitOrder({
      price: '1',
      qty: '2',
      side: 'SELL'
    }));

    book.addOrder(new MarketOrder({
      id: orderId,
      qty: '3',
      side: 'SELL'
    }));

    expect(listener.mock.calls.length).toBe(1);
    expect(listener.mock.calls[0][0].id).toBe(orderId);
    expect(listener.mock.calls[0][1]).toBe(EBookErrorCode.NO_LIQUIDITY);
  });
});
