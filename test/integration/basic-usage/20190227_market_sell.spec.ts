import { Book, LimitOrder, MarketOrder } from '../../../src';

describe('Integration test suite: 20190227_market_sell', () => {

  let book: Book;

  beforeEach(() => {
    book = new Book();
  });

  test('Market order should be accepted and processed by the book', () => {
    let orderProcessingResult;

    book.addOrder(new LimitOrder({
      price: '1.86000000',
      qty: '0.23500000',
      side: 'BUY',
    }));

    book.addOrder(new LimitOrder({
      price: '1.80000000',
      qty: '10.00000000',
      side: 'BUY'
    }));

    orderProcessingResult = book.addOrder(new MarketOrder({
      qty: '0.23000000',
      side: 'SELL'
    }));
    expect(orderProcessingResult.isAccepted).toBe(true);
  });

  test('Bid, ask and market prices should change correctly during the test', () => {
    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('undefined');
    expect(String(book.marketPrice)).toBe('undefined');

    book.addOrder(new LimitOrder({
      price: '1.86000000',
      qty: '0.23500000',
      side: 'BUY',
    }));

    book.addOrder(new LimitOrder({
      price: '1.80000000',
      qty: '10.00000000',
      side: 'BUY'
    }));

    book.addOrder(new MarketOrder({
      qty: '0.23000000',
      side: 'SELL'
    }));

    expect(String(book.bid)).toBe('1.86');
    expect(String(book.ask)).toBe('undefined');
    expect(String(book.marketPrice)).toBe('1.86');
  });

  test('A trade should occur and "trade" event should be emitted', () => {
    const order1Id = 'foo';
    const order2Id = 'bar';

    const listener = jest.fn();

    book.on('trade', listener);

    book.addOrder(new LimitOrder({
      id: order1Id,
      price: '1.86000000',
      qty: '0.23500000',
      side: 'BUY',
    }));

    book.addOrder(new LimitOrder({
      price: '1.80000000',
      qty: '10.00000000',
      side: 'BUY'
    }));

    book.addOrder(new MarketOrder({
      id: order2Id,
      qty: '0.23000000',
      side: 'SELL'
    }));

    expect(listener.mock.calls.length).toBe(1);
    expect(listener.mock.calls[0][0].order.id).toBe(order2Id);
    expect(listener.mock.calls[0][0].oppositeOrder.id).toBe(order1Id);
    expect(String(listener.mock.calls[0][0].price)).toBe('1.86');
    expect(String(listener.mock.calls[0][0].qty)).toBe('0.23');
  });

  test('Two order fills should occur and "order-filled" events should be emitted', () => {
    const order1Id = 'foo';
    const order2Id = 'bar';

    const listener = jest.fn();

    book.on('order-filled', listener);

    book.addOrder(new LimitOrder({
      id: order1Id,
      price: '1.86000000',
      qty: '0.23500000',
      side: 'BUY',
    }));

    book.addOrder(new LimitOrder({
      price: '1.80000000',
      qty: '10.00000000',
      side: 'BUY'
    }));

    book.addOrder(new MarketOrder({
      id: order2Id,
      qty: '0.23000000',
      side: 'SELL'
    }));

    expect(listener.mock.calls.length).toBe(2);

    expect(listener.mock.calls[0][0].order.id).toBe(order2Id);
    expect(listener.mock.calls[0][0].oppositeOrder.id).toBe(order1Id);
    expect(String(listener.mock.calls[0][0].price)).toBe('1.86');
    expect(String(listener.mock.calls[0][0].qty)).toBe('0.23');
    expect(listener.mock.calls[0][0].isFull).toBe(true);

    expect(listener.mock.calls[1][0].order.id).toBe(order1Id);
    expect(listener.mock.calls[1][0].oppositeOrder.id).toBe(order2Id);
    expect(String(listener.mock.calls[1][0].price)).toBe('1.86');
    expect(String(listener.mock.calls[1][0].qty)).toBe('0.23');
    expect(listener.mock.calls[1][0].isFull).toBe(false);
  });
});
