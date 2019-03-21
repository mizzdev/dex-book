import { Book, EBookErrorCode, LimitOrder } from '../../../src';

describe('Integration test suite: 20190303_limit_sell_stpf_cancellation', () => {

  let book: Book;

  beforeEach(() => {
    book = new Book();
  });

  test('STPF-violating order should be accepted as its first trade is STPF-compliant', () => {
    let orderProcessingResult;

    const stpfId1 = 'abc';
    const stpfId2 = 'def';

    orderProcessingResult = book.addOrder(new LimitOrder({
      stpfId: stpfId2,
      price: '1.80000000',
      qty: '10.00000000',
      side: 'BUY'
    }));
    expect(orderProcessingResult.isAccepted).toBe(true);

    orderProcessingResult = book.addOrder(new LimitOrder({
      stpfId: stpfId1,
      price: '1.86000000',
      qty: '0.23500000',
      side: 'BUY',
    }));
    expect(orderProcessingResult.isAccepted).toBe(true);

    orderProcessingResult = book.addOrder(new LimitOrder({
      stpfId: stpfId2,
      price: '1.80000000',
      qty: '0.24000000',
      side: 'SELL'
    }));
    expect(orderProcessingResult.isAccepted).toBe(true);
  });

  test('Bid, ask and market prices should change correctly during the test', () => {

    const stpfId1 = 'abc';
    const stpfId2 = 'def';

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('undefined');
    expect(String(book.marketPrice)).toBe('undefined');

    book.addOrder(new LimitOrder({
      stpfId: stpfId2,
      price: '1.80000000',
      qty: '10.00000000',
      side: 'BUY'
    }));

    expect(String(book.bid)).toBe('1.8');
    expect(String(book.ask)).toBe('undefined');
    expect(String(book.marketPrice)).toBe('undefined');

    book.addOrder(new LimitOrder({
      stpfId: stpfId1,
      price: '1.86000000',
      qty: '0.23500000',
      side: 'BUY',
    }));

    expect(String(book.bid)).toBe('1.86');
    expect(String(book.ask)).toBe('undefined');
    expect(String(book.marketPrice)).toBe('undefined');

    book.addOrder(new LimitOrder({
      stpfId: stpfId2,
      price: '1.80000000',
      qty: '0.24000000',
      side: 'SELL'
    }));

    expect(String(book.bid)).toBe('1.8');
    expect(String(book.ask)).toBe('undefined');
    expect(String(book.marketPrice)).toBe('1.86');
  });

  test('"order-cancelled" event should be emitted', () => {

    const listener = jest.fn();

    const order1Id = 'foo';
    const order2Id = 'bar';
    const order3Id = 'baz';

    const stpfId1 = 'abc';
    const stpfId2 = 'def';

    book.on('order-cancelled', listener);

    book.addOrder(new LimitOrder({
      id: order1Id,
      stpfId: stpfId2,
      price: '1.80000000',
      qty: '10.00000000',
      side: 'BUY'
    }));

    book.addOrder(new LimitOrder({
      id: order2Id,
      stpfId: stpfId1,
      price: '1.86000000',
      qty: '0.23500000',
      side: 'BUY',
    }));

    book.addOrder(new LimitOrder({
      id: order3Id,
      stpfId: stpfId2,
      price: '1.80000000',
      qty: '0.24000000',
      side: 'SELL'
    }));

    expect(listener.mock.calls.length).toBe(1);
    expect(listener.mock.calls[0][0].id).toBe(order3Id);
    expect(listener.mock.calls[0][1]).toBe(EBookErrorCode.WASH_TRADE_DENIED);
  });

  test('No trade should occur and "trade" event should not be emitted', () => {

    const listener = jest.fn();

    const order1Id = 'foo';
    const order2Id = 'bar';
    const order3Id = 'baz';

    const stpfId1 = 'abc';
    const stpfId2 = 'def';

    book.on('trade', listener);

    book.addOrder(new LimitOrder({
      id: order1Id,
      stpfId: stpfId2,
      price: '1.80000000',
      qty: '10.00000000',
      side: 'BUY'
    }));

    book.addOrder(new LimitOrder({
      id: order2Id,
      stpfId: stpfId1,
      price: '1.86000000',
      qty: '0.23500000',
      side: 'BUY',
    }));

    book.addOrder(new LimitOrder({
      id: order3Id,
      stpfId: stpfId2,
      price: '1.80000000',
      qty: '0.24000000',
      side: 'SELL'
    }));

    expect(listener.mock.calls.length).toBe(1);

    expect(listener.mock.calls[0][0].order.id).toBe(order3Id);
    expect(listener.mock.calls[0][0].oppositeOrder.id).toBe(order2Id);
    expect(String(listener.mock.calls[0][0].price)).toBe('1.86');
    expect(String(listener.mock.calls[0][0].qty)).toBe('0.235');
  });

  test('No order fills should occur and "order-filled" events should not be emitted', () => {

    const listener = jest.fn();

    const order1Id = 'foo';
    const order2Id = 'bar';
    const order3Id = 'baz';

    const stpfId1 = 'abc';
    const stpfId2 = 'def';

    book.on('order-filled', listener);

    book.addOrder(new LimitOrder({
      id: order1Id,
      stpfId: stpfId2,
      price: '1.80000000',
      qty: '10.00000000',
      side: 'BUY'
    }));

    book.addOrder(new LimitOrder({
      id: order2Id,
      stpfId: stpfId1,
      price: '1.86000000',
      qty: '0.23500000',
      side: 'BUY',
    }));

    book.addOrder(new LimitOrder({
      id: order3Id,
      stpfId: stpfId2,
      price: '1.80000000',
      qty: '0.24000000',
      side: 'SELL'
    }));

    expect(listener.mock.calls.length).toBe(2);

    expect(listener.mock.calls[0][0].order.id).toBe(order3Id);
    expect(listener.mock.calls[0][0].oppositeOrder.id).toBe(order2Id);
    expect(String(listener.mock.calls[0][0].price)).toBe('1.86');
    expect(String(listener.mock.calls[0][0].qty)).toBe('0.235');
    expect(listener.mock.calls[0][0].isFull).toBe(false);

    expect(listener.mock.calls[1][0].order.id).toBe(order2Id);
    expect(listener.mock.calls[1][0].oppositeOrder.id).toBe(order3Id);
    expect(String(listener.mock.calls[1][0].price)).toBe('1.86');
    expect(String(listener.mock.calls[1][0].qty)).toBe('0.235');
    expect(listener.mock.calls[1][0].isFull).toBe(true);
  });
});
