import { Book, EBookErrorCode, LimitOrder, MarketOrder } from '../../../src';

describe('Integration test suite: 20190227_market_buy_vlimit_zero_overpayments', () => {

  const volumeLimit = '27.00000000'; // 1.80000000 * 15.00000000

  let book: Book;

  beforeEach(() => {
    book = new Book();
  });

  test('Market order should be accepted and processed by the book', () => {
    let orderProcessingResult;

    book.addOrder(new LimitOrder({
      price: '1.86000000',
      qty: '20.00000000',
      side: 'SELL',
    }));

    book.addOrder(new LimitOrder({
      price: '1.80000000',
      qty: '10.00000000',
      side: 'SELL'
    }));

    orderProcessingResult = book.addOrder(new MarketOrder({
      qty: '15.00000000',
      availableVolume: volumeLimit,
      side: 'BUY'
    }));
    expect(orderProcessingResult.isAccepted).toBe(true);
  });

  test('Bid, ask and market prices should change correctly during the test', () => {
    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('undefined');
    expect(String(book.marketPrice)).toBe('undefined');

    book.addOrder(new LimitOrder({
      price: '1.86000000',
      qty: '20.00000000',
      side: 'SELL',
    }));

    book.addOrder(new LimitOrder({
      price: '1.80000000',
      qty: '10.00000000',
      side: 'SELL'
    }));

    book.addOrder(new MarketOrder({
      qty: '15.00000000',
      availableVolume: volumeLimit,
      side: 'BUY'
    }));

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('1.86');
    expect(String(book.marketPrice)).toBe('1.86');
  });

  test('"order-cancelled" event should be emitted', () => {

    const listener = jest.fn();

    const order1Id = 'foo';
    const order2Id = 'bar';
    const order3Id = 'baz';

    book.on('order-cancelled', listener);

    book.addOrder(new LimitOrder({
      id: order1Id,
      price: '1.86000000',
      qty: '20.00000000',
      side: 'SELL',
    }));

    book.addOrder(new LimitOrder({
      id: order2Id,
      price: '1.80000000',
      qty: '10.00000000',
      side: 'SELL'
    }));

    book.addOrder(new MarketOrder({
      id: order3Id,
      qty: '15.00000000',
      availableVolume: volumeLimit,
      side: 'BUY'
    }));

    expect(listener.mock.calls.length).toBe(1);
    expect(listener.mock.calls[0][0].id).toBe(order3Id);
    expect(listener.mock.calls[0][1]).toBe(EBookErrorCode.VOLUME_LIMIT_EXCEEDED);
  });

  test('Two trades should occur and "trade" events should be emitted', () => {

    const listener = jest.fn();

    const order1Id = 'foo';
    const order2Id = 'bar';
    const order3Id = 'baz';

    book.on('trade', listener);

    book.addOrder(new LimitOrder({
      id: order1Id,
      price: '1.86000000',
      qty: '20.00000000',
      side: 'SELL',
    }));

    book.addOrder(new LimitOrder({
      id: order2Id,
      price: '1.80000000',
      qty: '10.00000000',
      side: 'SELL'
    }));

    book.addOrder(new MarketOrder({
      id: order3Id,
      qty: '15.00000000',
      availableVolume: volumeLimit,
      side: 'BUY'
    }));

    expect(listener.mock.calls.length).toBe(2);

    expect(listener.mock.calls[0][0].order.id).toBe(order3Id);
    expect(listener.mock.calls[0][0].oppositeOrder.id).toBe(order2Id);
    expect(String(listener.mock.calls[0][0].price)).toBe('1.8');
    expect(String(listener.mock.calls[0][0].qty)).toBe('10');

    expect(listener.mock.calls[1][0].order.id).toBe(order3Id);
    expect(listener.mock.calls[1][0].oppositeOrder.id).toBe(order1Id);
    expect(String(listener.mock.calls[1][0].price)).toBe('1.86');
    expect(Number(listener.mock.calls[1][0].qty)).toBeCloseTo(4.84);
  });

  test('Four order fills should occur and "order-filled" events should be emitted', () => {

    const listener = jest.fn();

    const order1Id = 'foo';
    const order2Id = 'bar';
    const order3Id = 'baz';

    book.on('order-filled', listener);

    book.addOrder(new LimitOrder({
      id: order1Id,
      price: '1.86000000',
      qty: '20.00000000',
      side: 'SELL',
    }));

    book.addOrder(new LimitOrder({
      id: order2Id,
      price: '1.80000000',
      qty: '10.00000000',
      side: 'SELL'
    }));

    book.addOrder(new MarketOrder({
      id: order3Id,
      qty: '15.00000000',
      availableVolume: volumeLimit,
      side: 'BUY'
    }));

    expect(listener.mock.calls.length).toBe(4);

    expect(listener.mock.calls[0][0].order.id).toBe(order3Id);
    expect(listener.mock.calls[0][0].oppositeOrder.id).toBe(order2Id);
    expect(String(listener.mock.calls[0][0].price)).toBe('1.8');
    expect(String(listener.mock.calls[0][0].qty)).toBe('10');
    expect(listener.mock.calls[0][0].isFull).toBe(false);

    expect(listener.mock.calls[1][0].order.id).toBe(order2Id);
    expect(listener.mock.calls[1][0].oppositeOrder.id).toBe(order3Id);
    expect(String(listener.mock.calls[1][0].price)).toBe('1.8');
    expect(String(listener.mock.calls[1][0].qty)).toBe('10');
    expect(listener.mock.calls[1][0].isFull).toBe(true);

    expect(listener.mock.calls[2][0].order.id).toBe(order3Id);
    expect(listener.mock.calls[2][0].oppositeOrder.id).toBe(order1Id);
    expect(String(listener.mock.calls[2][0].price)).toBe('1.86');
    expect(Number(listener.mock.calls[2][0].qty)).toBeCloseTo(4.84);
    expect(listener.mock.calls[2][0].isFull).toBe(false);

    expect(listener.mock.calls[3][0].order.id).toBe(order1Id);
    expect(listener.mock.calls[3][0].oppositeOrder.id).toBe(order3Id);
    expect(String(listener.mock.calls[3][0].price)).toBe('1.86');
    expect(Number(listener.mock.calls[3][0].qty)).toBeCloseTo(4.84);
    expect(listener.mock.calls[3][0].isFull).toBe(false);
  });
});
