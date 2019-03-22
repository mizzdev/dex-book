import { Book, LimitOrder } from '../../../src';

describe('Integration test suite: 20190322_limit_buy_import', () => {

  let book: Book;

  beforeEach(() => {
    book = new Book();
  });

  test('Bid, ask and market prices should change correctly during the test', () => {
    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('undefined');
    expect(String(book.marketPrice)).toBe('undefined');

    book.importOrder(new LimitOrder({
      price: '1',
      qty: '1',
      side: 'BUY'
    }));

    expect(String(book.bid)).toBe('1');
    expect(String(book.ask)).toBe('undefined');
    expect(String(book.marketPrice)).toBe('undefined');
  });

  test('A trade should occur and "order-accepted" event should NOT be emitted', () => {

    const listener = jest.fn();

    book.on('order-accepted', listener);

    book.importOrder(new LimitOrder({
      price: '1',
      qty: '1',
      side: 'BUY'
    }));

    expect(listener.mock.calls.length).toBe(0);
  });

  test('A trade should occur and "order-rejected" event should NOT be emitted', () => {

    const listener = jest.fn();

    book.on('order-rejected', listener);

    book.importOrder(new LimitOrder({
      price: '1',
      qty: '1',
      side: 'BUY'
    }));

    expect(listener.mock.calls.length).toBe(0);
  });

  test('A trade should occur and "order-placed" event should NOT be emitted', () => {

    const listener = jest.fn();

    book.on('order-placed', listener);

    book.importOrder(new LimitOrder({
      price: '1',
      qty: '1',
      side: 'BUY'
    }));

    expect(listener.mock.calls.length).toBe(0);
  });
});
