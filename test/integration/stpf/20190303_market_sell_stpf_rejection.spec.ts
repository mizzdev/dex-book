import { Book, EBookErrorCode, LimitOrder, MarketOrder } from '../../../src';

describe('Integration test suite: 20190303_market_sell_stpf_rejection', () => {

  let book: Book;

  beforeEach(() => {
    book = new Book();
  });

  test('STPF-violating order should be rejected with the approptiate code', () => {
    let orderProcessingResult;

    const stpfId1 = 'foo';
    const stpfId2 = 'bar';

    orderProcessingResult = book.addOrder(new LimitOrder({
      stpfId: stpfId1,
      price: '1.80000000',
      qty: '10.00000000',
      side: 'BUY'
    }));
    expect(orderProcessingResult.isAccepted).toBe(true);

    orderProcessingResult = book.addOrder(new LimitOrder({
      stpfId: stpfId2,
      price: '1.86000000',
      qty: '0.23500000',
      side: 'BUY',
    }));
    expect(orderProcessingResult.isAccepted).toBe(true);

    orderProcessingResult = book.addOrder(new MarketOrder({
      stpfId: stpfId2,
      qty: '0.23000000',
      side: 'SELL'
    }));
    expect(orderProcessingResult.isAccepted).toBe(false);
    expect(orderProcessingResult.errorCode).toBe(EBookErrorCode.WASH_TRADE_DENIED);
  });

  test('Bid, ask and market prices should change correctly during the test', () => {

    const stpfId1 = 'foo';
    const stpfId2 = 'bar';

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('undefined');
    expect(String(book.marketPrice)).toBe('undefined');

    book.addOrder(new LimitOrder({
      stpfId: stpfId1,
      price: '1.80000000',
      qty: '10.00000000',
      side: 'BUY'
    }));

    expect(String(book.bid)).toBe('1.8');
    expect(String(book.ask)).toBe('undefined');
    expect(String(book.marketPrice)).toBe('undefined');

    book.addOrder(new LimitOrder({
      stpfId: stpfId2,
      price: '1.86000000',
      qty: '0.23500000',
      side: 'BUY',
    }));

    expect(String(book.bid)).toBe('1.86');
    expect(String(book.ask)).toBe('undefined');
    expect(String(book.marketPrice)).toBe('undefined');

    book.addOrder(new MarketOrder({
      stpfId: stpfId2,
      qty: '0.23000000',
      side: 'SELL'
    }));

    expect(String(book.bid)).toBe('1.86');
    expect(String(book.ask)).toBe('undefined');
    expect(String(book.marketPrice)).toBe('undefined');
  });

  test('No trade should occur and "trade" event should not be emitted', () => {

    const listener = jest.fn();

    const stpfId1 = 'foo';
    const stpfId2 = 'bar';

    book.on('trade', listener);

    book.addOrder(new LimitOrder({
      stpfId: stpfId1,
      price: '1.80000000',
      qty: '10.00000000',
      side: 'BUY'
    }));

    book.addOrder(new LimitOrder({
      stpfId: stpfId2,
      price: '1.86000000',
      qty: '0.23500000',
      side: 'BUY',
    }));

    book.addOrder(new MarketOrder({
      stpfId: stpfId2,
      qty: '0.23000000',
      side: 'SELL'
    }));

    expect(listener.mock.calls.length).toBe(0);
  });

  test('No order fills should occur and "order-filled" events should not be emitted', () => {

    const listener = jest.fn();

    const stpfId1 = 'foo';
    const stpfId2 = 'bar';

    book.on('order-filled', listener);

    book.addOrder(new LimitOrder({
      stpfId: stpfId1,
      price: '1.80000000',
      qty: '10.00000000',
      side: 'BUY'
    }));

    book.addOrder(new LimitOrder({
      stpfId: stpfId2,
      price: '1.86000000',
      qty: '0.23500000',
      side: 'BUY',
    }));

    book.addOrder(new MarketOrder({
      stpfId: stpfId2,
      qty: '0.23000000',
      side: 'SELL'
    }));

    expect(listener.mock.calls.length).toBe(0);
  });
});
