import { Book, LimitOrder, StopMarketOrder } from '../../../src';

describe('Integration test suite: 20190303_stop_market_cancellation', () => {

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

  test('Bid, ask and market prices should change correctly during the test', () => {

    const order1Id = 'foo';
    const order2Id = 'bar';
    const order3Id = 'baz';

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('undefined');
    expect(String(book.marketPrice)).toBe('1');

    book.addOrder(new LimitOrder({
      id: order1Id,
      price: '2',
      qty: '2',
      side: 'SELL',
    }));

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('2');
    expect(String(book.marketPrice)).toBe('1');

    book.addOrder(new StopMarketOrder({
      id: order2Id,
      price: '1',
      qty: '100000',
      side: 'BUY'
    }));

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('2');
    expect(String(book.marketPrice)).toBe('1');

    book.cancelOrder(order2Id);

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('2');
    expect(String(book.marketPrice)).toBe('1');

    book.addOrder(new LimitOrder({
      id: order3Id,
      price: '2',
      qty: '1',
      side: 'BUY'
    }));

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('2');
    expect(String(book.marketPrice)).toBe('2');
  });

  test('"order-cancelled" event should be emitted', () => {

    const listener = jest.fn();

    const order1Id = 'foo';
    const order2Id = 'bar';
    const order3Id = 'baz';

    book.on('order-cancelled', listener);

    book.addOrder(new LimitOrder({
      id: order1Id,
      price: '2',
      qty: '2',
      side: 'SELL',
    }));

    book.addOrder(new StopMarketOrder({
      id: order2Id,
      price: '1',
      qty: '100000',
      side: 'BUY'
    }));

    book.cancelOrder(order2Id);

    book.addOrder(new StopMarketOrder({
      id: order2Id,
      price: '1',
      qty: '100000',
      side: 'BUY'
    }));

    expect(listener.mock.calls.length).toBe(1);
    expect(listener.mock.calls[0][0].id).toBe(order2Id);
    expect(listener.mock.calls[0][1]).toBe(undefined);
  });
});
