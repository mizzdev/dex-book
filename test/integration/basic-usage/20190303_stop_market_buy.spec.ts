import { Book, LimitOrder, StopMarketOrder } from '../../../src';

describe('Integration test suite: 20190303_stop_market_buy', () => {

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

  test('Stop market order should be accepted and processed by the book', () => {
    let orderProcessingResult;

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

    orderProcessingResult = book.addOrder(new StopMarketOrder({
      price: '1',
      qty: '1',
      side: 'BUY'
    }));
    expect(orderProcessingResult.isAccepted).toBe(true);

    book.addOrder(new LimitOrder({
      price: '2',
      qty: '3',
      side: 'BUY'
    }));
  });

  test('Bid, ask and market prices should change correctly during the test', () => {
    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('undefined');
    expect(String(book.marketPrice)).toBe('1');

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

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('1');
    expect(String(book.marketPrice)).toBe('1');

    book.addOrder(new StopMarketOrder({
      price: '1',
      qty: '1',
      side: 'BUY'
    }));

    // Stop order placement itself should not immediately affect limit bid, ask or market price
    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('1');
    expect(String(book.marketPrice)).toBe('1');

    book.addOrder(new LimitOrder({
      price: '2',
      qty: '3',
      side: 'BUY'
    }));

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('undefined');
    expect(String(book.marketPrice)).toBe('2');
  });

  test('A trade should occur and "trade" event should be emitted', () => {
    const order1Id = 'foo';
    const order2Id = 'bar';
    const order3Id = 'baz';
    const order4Id = 'qux';

    const listener = jest.fn();

    book.on('trade', listener);

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

    book.addOrder(new StopMarketOrder({
      id: order3Id,
      price: '1',
      qty: '1',
      side: 'BUY'
    }));

    book.addOrder(new LimitOrder({
      id: order4Id,
      price: '2',
      qty: '3',
      side: 'BUY'
    }));

    expect(listener.mock.calls.length).toBe(3);

    expect(listener.mock.calls[0][0].order.id).toBe(order4Id);
    expect(listener.mock.calls[0][0].oppositeOrder.id).toBe(order2Id);
    expect(String(listener.mock.calls[0][0].price)).toBe('1');
    expect(String(listener.mock.calls[0][0].qty)).toBe('2');

    expect(listener.mock.calls[1][0].order.id).toBe(order4Id);
    expect(listener.mock.calls[1][0].oppositeOrder.id).toBe(order1Id);
    expect(String(listener.mock.calls[1][0].price)).toBe('2');
    expect(String(listener.mock.calls[1][0].qty)).toBe('1');

    expect(listener.mock.calls[2][0].order.id).toBe(order3Id);
    expect(listener.mock.calls[2][0].oppositeOrder.id).toBe(order1Id);
    expect(String(listener.mock.calls[2][0].price)).toBe('2');
    expect(String(listener.mock.calls[2][0].qty)).toBe('1');
  });

  test('Two order fills should occur and "order-filled" events should be emitted', () => {
    const order1Id = 'foo';
    const order2Id = 'bar';
    const order3Id = 'baz';
    const order4Id = 'qux';

    const listener = jest.fn();

    book.on('order-filled', listener);

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

    book.addOrder(new StopMarketOrder({
      id: order3Id,
      price: '1',
      qty: '1',
      side: 'BUY'
    }));

    book.addOrder(new LimitOrder({
      id: order4Id,
      price: '2',
      qty: '3',
      side: 'BUY'
    }));

    expect(listener.mock.calls.length).toBe(6);

    expect(listener.mock.calls[0][0].order.id).toBe(order4Id);
    expect(listener.mock.calls[0][0].oppositeOrder.id).toBe(order2Id);
    expect(String(listener.mock.calls[0][0].price)).toBe('1');
    expect(String(listener.mock.calls[0][0].qty)).toBe('2');
    expect(listener.mock.calls[0][0].isFull).toBe(false);

    expect(listener.mock.calls[1][0].order.id).toBe(order2Id);
    expect(listener.mock.calls[1][0].oppositeOrder.id).toBe(order4Id);
    expect(String(listener.mock.calls[1][0].price)).toBe('1');
    expect(String(listener.mock.calls[1][0].qty)).toBe('2');
    expect(listener.mock.calls[1][0].isFull).toBe(true);

    expect(listener.mock.calls[2][0].order.id).toBe(order4Id);
    expect(listener.mock.calls[2][0].oppositeOrder.id).toBe(order1Id);
    expect(String(listener.mock.calls[2][0].price)).toBe('2');
    expect(String(listener.mock.calls[2][0].qty)).toBe('1');
    expect(listener.mock.calls[2][0].isFull).toBe(true);

    expect(listener.mock.calls[3][0].order.id).toBe(order1Id);
    expect(listener.mock.calls[3][0].oppositeOrder.id).toBe(order4Id);
    expect(String(listener.mock.calls[3][0].price)).toBe('2');
    expect(String(listener.mock.calls[3][0].qty)).toBe('1');
    expect(listener.mock.calls[3][0].isFull).toBe(false);

    expect(listener.mock.calls[4][0].order.id).toBe(order3Id);
    expect(listener.mock.calls[4][0].oppositeOrder.id).toBe(order1Id);
    expect(String(listener.mock.calls[4][0].price)).toBe('2');
    expect(String(listener.mock.calls[4][0].qty)).toBe('1');
    expect(listener.mock.calls[4][0].isFull).toBe(true);

    expect(listener.mock.calls[5][0].order.id).toBe(order1Id);
    expect(listener.mock.calls[5][0].oppositeOrder.id).toBe(order3Id);
    expect(String(listener.mock.calls[5][0].price)).toBe('2');
    expect(String(listener.mock.calls[5][0].qty)).toBe('1');
    expect(listener.mock.calls[5][0].isFull).toBe(true);
  });
});
