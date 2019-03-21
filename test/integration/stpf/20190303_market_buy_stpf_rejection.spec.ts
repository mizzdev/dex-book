import { Book, EBookErrorCode, LimitOrder, MarketOrder } from '../../../src';

describe('Integration test suite: 20190303_market_buy_stpf_rejection', () => {

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
      price: '2',
      qty: '2',
      side: 'SELL',
    }));
    expect(orderProcessingResult.isAccepted).toBe(true);

    orderProcessingResult = book.addOrder(new LimitOrder({
      stpfId: stpfId2,
      price: '1',
      qty: '2',
      side: 'SELL'
    }));
    expect(orderProcessingResult.isAccepted).toBe(true);

    orderProcessingResult = book.addOrder(new MarketOrder({
      stpfId: stpfId2,
      qty: '3',
      side: 'BUY'
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
      price: '2',
      qty: '2',
      side: 'SELL',
    }));

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('2');
    expect(String(book.marketPrice)).toBe('undefined');

    book.addOrder(new LimitOrder({
      stpfId: stpfId2,
      price: '1',
      qty: '2',
      side: 'SELL'
    }));

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('1');
    expect(String(book.marketPrice)).toBe('undefined');

    book.addOrder(new MarketOrder({
      stpfId: stpfId2,
      qty: '3',
      side: 'BUY'
    }));

    expect(String(book.bid)).toBe('undefined');
    expect(String(book.ask)).toBe('1');
    expect(String(book.marketPrice)).toBe('undefined');
  });

  test('No trade should occur and "trade" event should not be emitted', () => {

    const listener = jest.fn();

    const stpfId1 = 'foo';
    const stpfId2 = 'bar';

    book.on('trade', listener);

    book.addOrder(new LimitOrder({
      stpfId: stpfId1,
      price: '2',
      qty: '2',
      side: 'SELL',
    }));

    book.addOrder(new LimitOrder({
      stpfId: stpfId2,
      price: '1',
      qty: '2',
      side: 'SELL'
    }));

    book.addOrder(new MarketOrder({
      stpfId: stpfId2,
      qty: '3',
      side: 'BUY'
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
      price: '2',
      qty: '2',
      side: 'SELL',
    }));

    book.addOrder(new LimitOrder({
      stpfId: stpfId2,
      price: '1',
      qty: '2',
      side: 'SELL'
    }));

    book.addOrder(new MarketOrder({
      stpfId: stpfId2,
      qty: '3',
      side: 'BUY'
    }));

    expect(listener.mock.calls.length).toBe(0);
  });
});
