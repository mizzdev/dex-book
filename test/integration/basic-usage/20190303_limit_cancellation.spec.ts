import { Book, LimitOrder } from '../../../src';

describe('Integration test suite: 20190303_limit_cancellation', () => {

  let book: Book;

  beforeEach(() => {
    book = new Book();
  });

  test('Bid, ask and market prices should change correctly during the test', () => {

    const order1Id = 'foo';
    const order2Id = 'bar';

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('undefined');
    expect(String(book.marketPrice)).toBe('undefined');

    book.addOrder(new LimitOrder({
      id: order1Id,
      price: '2',
      qty: '2',
      side: 'SELL',
    }));

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('2');
    expect(String(book.marketPrice)).toBe('undefined');

    book.addOrder(new LimitOrder({
      id: order2Id,
      price: '1',
      qty: '2',
      side: 'SELL'
    }));

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('1');
    expect(String(book.marketPrice)).toBe('undefined');

    book.cancelOrder(order2Id);

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('2');
    expect(String(book.marketPrice)).toBe('undefined');
  });

  test('"order-cancelled" event should be emitted', () => {

    const listener = jest.fn();

    const order1Id = 'foo';
    const order2Id = 'bar';

    book.on('order-cancelled', listener);

    book.addOrder(new LimitOrder({
      id: order1Id,
      price: '2',
      qty: '2',
      side: 'SELL',
    }));

    book.addOrder(new LimitOrder({
      id: order2Id,
      price: '1',
      qty: '2',
      side: 'SELL'
    }));

    book.cancelOrder(order2Id);

    expect(listener.mock.calls.length).toBe(1);
    expect(listener.mock.calls[0][0].id).toBe(order2Id);
    expect(listener.mock.calls[0][1]).toBe(undefined);
  });
});
