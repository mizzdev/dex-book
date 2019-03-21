# Distributable Exchange Book

> A simplistic Node.js TypeScript order book for trading engines

## Disclaimer

This software is not intended to be a public open source solution. If you ever get a copy of this package, most likely you received it as a part of a private commercial solution, so please refrain from publishing it to any public repositories (e.g. GitHub public repository or npm registry) to avoid any potential NDA breaches and/or other copyright/licensing issues.

## Table of contents

1. [Installation](#installation)
2. [Usage](#usage)
    1. [Order types](#order-types)
        1. [Limit order](#limit-order)
        2. [Market order](#market-order)
        3. [Stop-market (a.k.a. stop-loss) order](#stop-market-order)
        4. [Stop-limit order](#stop-limit-order)
    2. [Features](#features)
        1. [Binary search for order insertion/removal](#binary-search)
        2. [Self-Trade Prevention Functionality](#stpf)
        3. [Volume Limiting](#vlimit)
        4. [Persistence](#persistence)
        4. [Extension points](#extension)
    3. [Events](#events)
        1. [EBookEvent.ORDER_ACCEPTED (*"order-accepted"*)](#ev-order-accepted)
        2. [EBookEvent.ORDER_REJECTED (*"order-rejected"*)](#ev-order-rejected)
        3. [EBookEvent.ORDER_CANCELLED (*"order-cancelled"*)](#ev-order-cancelled)
        4. [EBookEvent.ORDER_PLACED (*"order-placed"*)](#ev-order-placed)
        5. [EBookEvent.ORDER_DISPLACED (*"order-displaced"*)](#ev-order-displaced)
        6. [EBookEvent.ORDER_FILLED (*"order-filled"*)](#ev-order-filled)
        7. [EBookEvent.TRADE (*"trade"*)](#ev-trade)
    4. [Error codes](#error-codes)
        1. [EBookErrorCode.ID_CONFLICT](#error-id)
        1. [EBookErrorCode.NO_LIQUIDITY](#error-liquidity)
        1. [EBookErrorCode.NO_TRADES](#error-trades)
        1. [EBookErrorCode.STOP_PRICE_TOO_HIGH](#error-spth)
        1. [EBookErrorCode.STOP_PRICE_TOO_LOW](#error-sptl)
        1. [EBookErrorCode.WASH_TRADE_DENIED](#error-stpf)
        1. [EBookErrorCode.VOLUME_LIMIT_EXCEEDED](#error-vlimit)
        1. [EBookErrorCode.CUSTOM](#error-custom)
3. [Documentation](#documentation)
4. [Testing](#testing)
5. [Development](#development)

## Installation<a name="installation"></a>

> The package is compiled into ES2016, supported by Node.js starting from version 7.5.0

> **IMPORTANT**: As this is a proprietary module, it is not published to any npm repository, thus is not build into JavaScript from TypeScript sources. That is why you would generally prefer to receive a build repository branch or an archive with the prebuilt library. Alternatively, you may call ```npm build``` in the module folder before installing from it.

After you have registered the pre-built package in your package.json you may simply use:

```bash
$ npm install
```

or

```bash
$ npm install dex-book --save
```

or 

```bash
$ npm install ./lib/dex-book --save
```

depending on your package.json configuration and where are you installing this package from.

## Usage<a name="usage"></a>

> The order book operates on numeric type provided by [Big.js](http://mikemcl.github.io/big.js/) -  A small, fast, easy-to-use library for arbitrary-precision decimal arithmetic.
That means you will never encounter floating-point rounding errors and also you won't approach maximum and minimum value limits of double-precision floating point numbers (which all default Javascript numbers are under the hood). The operating range for *Big.js* numbers is really *Big*: from `1e-1000000` to `1e+1000000` of magnitude for both negative and positive numbers without any precision loss.
On the other side you cannot use standard comparison "<" ">" "<=" ">=" "===" operators or arithmetic "+" "-" "*" "/" operators on the numbers returned by the order book. Instead, you may convert them to *string* or *number* or use *Big.js* methods for manipulation.

```javascript

const { Book, LimitOrder } = require('dex-book');

const book = new Book();

// If the book is newly created and does not contain any orders, bid and ask prices will be undefined
console.log(book.bid); // undefined
console.log(book.ask); // undefined

// If the book did not match any orders yet (no actual trades occured), the market price will also be undefined
console.log(book.marketPrice); // undefined

// Let us listen to an event which triggers each time a trade occurs
book.on('trade', (trade) => {
  const now = (new Date()).toISOString();
  const msg = `${now} Price: ${trade.price.toFixed(8)} Qty: ${trade.qty.toFixed(8)}`;
  console.log(msg); // 2019-02-24T04:12:01.320Z Price: 1.86000000 Qty: 0.23000000
});

// Let us create some bid (buy) orders
book.addOrder(new LimitOrder({
  side: 'BUY',
  qty: '0.23500000',
  price: '1.86000000'
})); // { orderId: '4a0e539d-4db0-4ef5-980c-ae5f406a5b14', isAccepted: true }
book.addOrder(new LimitOrder({
  side: 'BUY',
  qty: '10.00000000',
  price: '1.80000000'
}));

// As long as there are some buy orders the bid price will contain "Big" numeric type value
console.log(book.bid.toFixed(8)); // 1.86000000

// This ask (sell) order will generate a trade, because it covers the bid price of 1.86
book.addOrder(new LimitOrder({
  side: 'SELL',
  qty: '0.23000000',
  price: '1.86000000'
}));

// The market prices is set after the first trade
console.log(book.marketPrice.toFixed(8)); // 1.86000000

```

### Order types<a name="order-types"></a>

All types of orders support this list of fields as options on instantiation:

```typescript
side: 'BUY' | 'SELL' // (required) The order side. Determines if the order is to buy or to sell. Orders of different sides are stored and sorted separately.
qty: Big // (required) Order quantity to be traded
initialQty: Big // (optional) Initial order quantity. Set this only if this order was already persisted somewhere.
id: string // (optional) The ID of the order. Should be unique. If not set, it will be a generated UUID.
stpfId: string // (optional) If set, STPF is active for this order
shouldSuppressAcceptEvents: boolean // (optional) If set, no ORDER_ACCEPTED events will be fired for this order
meta: any // (optional) The order metadata. Does not affect the order book operation. Everything can be put here. Will be initialized as {} if not set.
```

All of these properties are accessible (as read-only) after order creation:

```javascript

const order = new LimitOrder({
  side: 'SELL',
  qty: '0.23000000',
  price: '1.86000000'
}

console.log(order.side); // SELL
console.log(order.price.toString()) // 1.86

```

Also orders of each type have ```orderType``` string property. Its value may be used to avoid ```instanceof``` checks to determine type of each particular order.

```javascript
console.log(order.orderType); // LIMIT
```

<br/>

#### Limit order<a name="limit-order"></a>

> ```orderType``` value: ```"LIMIT"```

A limit order is an order placed to execute a buy or sell transaction at a set number of shares and at a specified limit price or better. It is a take-profit order placed to buy or sell a set amount of a financial instrument at a specified price or better.

Besides common fields for all order types, limit order supports *price* option, which specifies limit price of the order.

#### Market order<a name="market-order"></a>

> ```orderType``` value: ```"MARKET"```

A market order is a buy or sell order to be executed immediately at the current market prices. As long as there are willing sellers and buyers, market orders are filled. Market orders are used when certainty of execution is a priority over the price of execution. A market order is the simplest of the order types. This order type does not allow any control over the price received. The order is filled at the best price available at the relevant time.

Besides common fields for all order types, market order supports following options:

```typescript
availableVolume: Big | string // (optional) if provided, enables Volume Limiting with the specified max available volume
volumeLimitQtyPrecision: Big | string // (optional) only makes sense if Volume Limiting is enabled (availableVolume provided). Rounds the trade quantity to the fixed precision if Volume Limiting is triggered. Examples: "1e-8", "0.00000001"
```

<br/>

#### Stop-market (a.k.a. stop-loss) order<a name="stop-market-order"></a>

> ```orderType``` value: ```"STOP_MARKET"```

A stop order, also referred to as a stop-loss order, is an order to buy or sell a stock once the price of the stock reaches a specified price, known as the stop price. When the stop price is reached, a stop order becomes a market order. A buy–stop order is entered at a stop price above the current market price. Investors generally use a buy stop order to limit a loss or to protect a profit on a stock that they have sold short. A sell–stop order is entered at a stop price below the current market price. Investors generally use a sell–stop order to limit a loss or to protect a profit on a stock that they own.

Besides common fields for all order types, stop-market order supports following options:

```typescript
price: Big | string // (required) stop price of the order
availableVolume: Big | string // (optional) if provided, enables Volume Limiting with the specified max available volume
volumeLimitQtyPrecision: Big | string // (optional) only makes sense if Volume Limiting is enabled (availableVolume provided). Rounds the trade quantity to the fixed precision if Volume Limiting is triggered. Examples: "1e-8", "0.00000001"
```

*availableVolume* and *volumeLimit* options will **NOT** affect the stop order behaviour itself, but will apply to the **converted** order.


#### Stop-limit order<a name="stop-limit-order"></a>

> ```orderType``` value: ```"STOP_LIMIT"```

A stop–limit order is an order to buy or sell a stock that combines the features of a stop order and a limit order. Once the stop price is reached, a stop-limit order becomes a limit order that will be executed at a specified price (or better).

Besides common fields for all order types, stop-limit order supports following options:

```typescript
price: Big | string // (required) stop price of the order
limitPrice: Big | string // (required) limit price of the converted order
```

<br/>

### Features<a name="features"></a>

#### Binary search for order insertion/removal<a name="binary-search"></a>

The order book keeps all the orders in the sorted price bins and sorted by time inside the price bin. This allows to perform binary search for a target price bin, reducing search complexity from *O(n)* to *O(log(n))* where *n* is number of distinct prices in the book.

##### Insertion

The price bin is an array itself where insertion is always done by pushing order to the end, which takes *O(1)*. Also the book checks if the newcoming order is inside the spread. In this case the binary search step is bypassed and the whole insertion is done in *O(1)* time.

##### Removal

If a removal occurs due to full order execution, the removal takes *O(1)* time, because the order is taken from the top price bin of the book in this case and is popped from the head of the price bin.
If a removal occurs due to manual cancellation, this will take *O(mlog(n))* time, where *m* is amount of orders inside the price bin.

#### Self-Trade Prevention Functionality<a name="stpf"></a>

There is a form of market manipulation called [Wash Trade](https://en.wikipedia.org/wiki/Wash_trade) in which someone will place a sell order, then place a buy order to buy from himself, or vice versa. This leads to creation of artificial activity on the market. Such practice is forbidden and should be prevented on the trading engine level. *Distributable Exchange Book* provides this optional feature which may be enabled by setting *stpfId* field in order creation options. If the order is matched with another order with the same *stpfId*, the newcoming order will be automatically rejected or cancelled (if it was previously matched with other orders and generated trades).

#### Volume Limiting<a name="vlimit"></a>

A market order may be split across multiple participants on the other side of the transaction, resulting in different prices for some of the shares. This is called *slippage*. For market sell orders there only thing the order creator risks is getting less profit from selling the specified amount of their security. However, slippage for market buy orders may result in the order creator being charged more than they have on their balance. To avoid that, you may enable *Volume Limiting*.

> **NOTE**: For market sell orders Volume Limiting is generally not needed unless the sell is not intended to open a short trade position.

Let us take some hypothetical XCN/USD trades as an example. Current market price is 350, meaning you have to spend 350 USD to buy 1 XCN. A user has 3520 USD on their balance. The user is willing to buy 10 XCN using market order, which would cost 3500 USD if there is enough sell liquidity at price 350. However, if at the middle of market order the price rises to, let's say, 355 due to slippage, the buyer may be charged up to 3550 USD, which exceeds user balance. To prevent this from happening we may freeze his free USD balance for the time of market order execution and create a market order with quantity of 10 and volume limit of 3520 (equal to the amount of USD funds frozen). The order is created with the counter of remaining available volume to be traded. Each time a trade is made, this counter is decremented by the trade volume:

```trade volume = trade price * trade quantity```

If the trade volume exceeds the amount of available volume of the market order, the trade quantity is automatically reduced, so that the trade volume would equal strictly to the remaining amount of available volume:

``` new trade quantity = available volume / trade price```

```new trade volume = trade price * new trade quantity```

After such trade is created and both orders are filled by the reduced quantity, the market order is immediately canceled with [EBookErrorCode.VOLUME_LIMIT_EXCEEDED](#error-vlimit).

This way the book may guarantee that during this maker order execution the buyer will never spend more than 3520 USD and their balance will never go negative.

To enable Volume Limiting, ```availableVolume``` option should be provided on the market order creation.

```javascript
const order = new MarketOrder({
  ...,
  availableVolume: '3520'
});
```

It is important to mention that division operation may result in the numbers of trade quantity with a large amount of fractional decimal places, much more than any trading engine usually operates with. Moreover, the rounding errors may be introduced despite having a million of decimal places supported. This will inevitably lead to accumulation of microscopic amounts of residual funds (like billionth fractions of cents) on user balances. To avoid that, the reduced trade quantity may be truncated to the desired precision using ```volumeLimitQtyPrecision``` option, so the order of accumulated residuals might be controlled. For example, if one wants to truncate quantities to 8 significant digits:

```javascript
const order = new MarketOrder({
  ...,
  availableVolume: '3520',
  volumeLimitQtyPrecision: '1e-8'
});
```

<br/>

#### Persistence<a name="persistence"></a>

The order book is intentionally agnostic of incoming data validation, fault tolerance systems, persistence/backup layer, messaging transport, trading symbol state management, historical price collection and aggregation, user balances, etc.

This is because the order book focuses on a restricted set of duties:

1. Store the incoming orders in a price-time sorted in memory
2. Match the incoming orders with orders already placed in the book on conditions which satisfy incoming order type and parameters (e.g. limit price for limit orders)
3. For a pair of matched orders generate a trade event with certain price and base asset quantity
4. Remove the orders from the book on their full execution

However, *Distributable Exchange Book* fires specific events to assist you with connecting it to your persistence system:

* [EBookEvent.ORDER_PLACED](#ev-order-placed) is fired each time a new order is placed into the book outside the spread (lower than bid or higher than ask) so you may insert the order into your database.
* [EBookEvent.ORDER_DISPLACED](#ev-order-displaced) is fired each time an order has been removed from the book due to its full execution or cancellation so you may remove the order from your database.
* [EBookEvent.ORDER_FILLED](#ev-order-filled) is fired each time an order is executed (partial or full execution) so you may update the remaining unexecuted order quantity in your database.

Also the book has *importOrder()* method which assumes that you instantiate an order from the database record you previously persisted the order in and pass the order to this method. This method places orders into the book without trying to match them or check any preconditions.

```javascript

const orderData = await Order.getById('123-foo-bar'); // A call to your ORM

/**
 * The orderData may be something like:
 * {
 *   id: '123-foo-bar',
 *   orderType: 'LIMIT',
 *   side: 'SELL',
 *   qty: '0.20000000',
 *   initialQty: '0.23000000',
 *   price: '1.86000000'
 * }
 */

book.importOrder(new LimitOrder(orderData));
```

<br/>

#### Extension points<a name="extension"></a>

It is possible to define own order types by inheriting from the abstract Order class:

```javascript
const { Order } = require('dex-book/Order');

class CustomOrder extends Order {

  process(context) {
    super.process(context);

    // Implement you own processing behaviour here
  }
}
```

There is a variety of auxiliary classes, which may come in help, in ```"dex-book/Book"```, ```"dex-book/Order"``` and ```"dex-book/Trade"``` packages.

Please feel free to check the documentation for more information about all of the internal abstractions.

### Events<a name="events"></a>

Each time the state of the book changes, the book emits events which you can subscribe for.

Implements methods of Node.js EventEmitter API, but **does not inherit** from *EventEmitter*.

Event emitting and listener calling is *synchronous* as the order book is synchronous, so synchronous code in the listener body will block further order execution.

String values (aliases) are also supported for the sake of convinience of regular Javascript (non-Typescript) users.

```javascript
book.on('order-accepted', (order) => { ... });
```

is the same as

```javascript
book.on(EBookEvent.ORDER_ACCEPTED, (order) => { ... });
```

Event listeners should be registered **before** passing any orders into the order book.

#### EBookEvent.ORDER_ACCEPTED (*"order-accepted"*)<a name="ev-order-accepted"></a>

Emitted each time a newcoming order is succesfully accepted. If the order is not rejected, this event is fired **before** everything else.

For example, if the order was immediately executed on acceptance, the event order is the following:

1. ORDER_ACCEPTED
2. ORDER_FILLED
3. ORDER_FILLED
4. TRADE
5. ORDER_PLACED

```javascript

const { Book, LimitOrder, EBookEvent } = require('dex-book');

const Book = new Book();

book.on(EBookEvent.ORDER_ACCEPTED, (order) => {
  console.log(order.id); // order-1
});

book.addOrder(new LimitOrder({
  id: 'order-1',
  side: 'BUY',
  qty: '0.23500000',
  price: '1.86000000'
}));

```

<br/>

#### EBookEvent.ORDER_REJECTED (*"order-rejected"*)<a name="ev-order-rejected"></a>

Emitted each time a newcoming order is rejected. Rejection reason is appended. If an order is rejected, it won't result in any trades and ORDER_REJECTED will be the only event emitted regarding this order.

```javascript

const { Book, MarketOrder, EBookEvent, EBookErrorCode } = require('dex-book');

const Book = new Book();

book.on(EBookEvent.ORDER_REJECTED, (order, reason) => {
  console.log(order.id); // order-1
  console.log(EBookErrorCode[reason]); // NO_LIQUIDITY
});

book.addOrder(new MarketOrder({
  id: 'order-1',
  side: 'BUY',
  qty: '0.23500000'
}));

```

<br/>

#### EBookEvent.ORDER_CANCELLED (*"order-cancelled"*)<a name="ev-order-cancelled"></a>

Emitted each time an order is cancelled. Cancellation reason is appended only if it is not a manual (user-invoked) cancellation.

```javascript
book.on(EBookEvent.ORDER_CANCELLED, (order, reason) => {

  if (!reason) {
    // Manual cancellation
    return;
  }

  // Otherwise the order book had to forcefully cancel the order

  console.log(EBookErrorCode[reason]); // NO_TRADES
});
```

<br/>

#### EBookEvent.ORDER_PLACED (*"order-placed"*)<a name="ev-order-placed"></a>

Emitted each time a limit or stop order is placed to the book and ready to be persisted. If a limit order is immediately executed and completely filled on acceptance, this event won't be emitted.

```javascript
book.on(EBookEvent.ORDER_PLACED, (order) => {

  // You may distinguish between order types by orderType field 
  console.log(order.orderType); // STOP_LIMIT
});
```

<br/>

#### EBookEvent.ORDER_DISPLACED (*"order-displaced"*)<a name="ev-order-displaced"></a>

Emitted each time a limit or stop order is removed from the book and may be removed from the persistent store.


```javascript
book.on(EBookEvent.ORDER_DISPLACED, (order) => {

  // You may distinguish between order types by orderType field 
  console.log(order.orderType); // STOP_LIMIT
});
```

<br/>

#### EBookEvent.ORDER_FILLED (*"order-filled"*)<a name="ev-order-filled"></a>

Emitted each time an order is executed (filled). Fill data is appended. For each trade 2 (two) ORDER_FILLED events are generated - for the newcoming (aggressing) order and for the matched (resting) order.
ORDER_FILLED events always come before TRADE event.

Fill data is passed to the event listeners with the following fields:

```typescript
  order: IOrder; /* Order being filled */
  oppositeOrder: IOrder; /* Opposing order of the fill */
  price: Big; /* Price of the trade which resulted to the fill */
  qty: Big; /* Quantity filled */
  isFull: boolean; /* If the fill quantity was enough to completely execute the order */
```

Example:

```javascript

const { Book, LimitOrder, EBookEvent } = require('dex-book');

const Book = new Book();

book.on(EBookEvent.ORDER_FILLED, (orderFill) => {

  // This function will be called 2 times. Now let's observe the first emit:

  console.log(orderFill.order.id); // order-3
  console.log(orderFill.opposingOrder.id); // order-1
  console.log(orderFill.price.toString()); // 1.86
  console.log(orderFill.qty.toString()); // 1.235
  console.log(orderFill.isFull); // true
});

book.addOrder(new LimitOrder({
  id: 'order-1',
  side: 'BUY',
  qty: '0.23500000',
  price: '1.86000000'
}));

book.addOrder(new LimitOrder({
  id: 'order-2'
  side: 'BUY',
  qty: '10.00000000',
  price: '1.80000000'
}));

book.addOrder(new LimitOrder({
  id: 'order-3'
  side: 'SELL',
  qty: '0.23000000',
  price: '1.86000000'
}));

```

<br/>

#### EBookEvent.TRADE (*"trade"*)<a name="ev-trade"></a>

Emitted each time an order matching results in a trade. Trade data is appended.

Fill data is passed to the event listeners with the following fields:

```typescript
  order: IOrder; /* Newcoming (aggressing) order */
  oppositeOrder: IOrder; /* Matched (resting) order */
  price: Big; /* Price of the trade */
  qty: Big; /* Quantity traded */
```

Example:

```javascript

const { Book, LimitOrder, EBookEvent } = require('dex-book');

const Book = new Book();

book.on(EBookEvent.TRADE, (trade) => {
  console.log(trade.order.id); // order-3
  console.log(trade.opposingOrder.id); // order-1
  console.log(trade.price.toString()); // 1.86
  console.log(trade.qty.toString()); // 1.235
});

book.addOrder(new LimitOrder({
  id: 'order-1',
  side: 'BUY',
  qty: '0.23500000',
  price: '1.86000000'
}));

book.addOrder(new LimitOrder({
  id: 'order-2'
  side: 'BUY',
  qty: '10.00000000',
  price: '1.80000000'
}));

book.addOrder(new LimitOrder({
  id: 'order-3'
  side: 'SELL',
  qty: '0.23000000',
  price: '1.86000000'
}));

```

<br/>

### Error codes<a name="error-codes"></a>

If something goes wrong, any order can be rejected and/or cancelled with one of the specified codes.

> Generally, you want to check for these conditions **before** an order even gets to the order book. For example, you may check if order with the same ID already exists on your gateway or public web API level using a cache/database. The same is true for checking stop price - your API may check a dedicated ticker cache for the distance between the current market price and the stop price of the newcoming order. Doing this will not only reduce the event processing overhead from the order book, allowing to spend more precious CPU time for valid order matching and trade generation, but also encourages to develop more reliable and safe public APIs.

#### EBookErrorCode.ID_CONFLICT<a name="error-id"></a>

Occurs when the *id* of the newcoming order has been already used for some other order placed into the book. Orders can only be rejected with this error code; once an order has been accepted, it will never be cancelled with this error code. However, the newcoming orders with the same id are guaranteed to be rejected with this error code.

```javascript

  const { Book, LimitOrder, EBookErrorCode } = require('dex-book');

  const Book = new Book();

  book.on('order-rejected', (order, reason) => {
    console.log(reason === EBookErrorCode.ID_CONFLICT); // true
  });

  book.addOrder(new LimitOrder({
    price: '2',
    qty: '2',
    side: 'SELL',
  }));

  book.addOrder(new LimitOrder({
    id: 'same-id',
    price: '1',
    qty: '2',
    side: 'SELL'
  }));

  // This order will be rejected
  const result = book.addOrder(new LimitOrder({
    id: 'same-id',
    price: '2',
    qty: '3',
    side: 'BUY'
  }));

  console.log(result.orderId); // same-id
  console.log(result.isAccepted); // false
  console.log(result.errorCode === EBookErrorCode.ID_CONFLICT); // true

```

<br/>

#### EBookErrorCode.NO_LIQUIDITY<a name="error-liquidity"></a>

Occurs when there are no limit orders in the opposite book side to match with the market order. Market orders can be rejected with this code if the opposite book side is empty initially, or cancelled in the middle of processing if all of the opposite book liquidity (opposite orders) has been matched and traded during execution of the current market order and there is still some quantity left to be filled for it.

```javascript

  const { Book, LimitOrder, MarketOrder, EBookErrorCode } = require('dex-book');

  const Book = new Book();

  book.on('order-rejected', (order, reason) => {
    console.log(reason === EBookErrorCode.NO_LIQUIDITY); // true
  });

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

  // This order will be rejected
  const result = book.addOrder(new MarketOrder({
    id: 'your-order-id',
    qty: '3',
    side: 'SELL'
  }));

  console.log(result.orderId); // your-order-id
  console.log(result.isAccepted); // false
  console.log(result.errorCode === EBookErrorCode.NO_LIQUIDITY); // true

```

<br/>

#### EBookErrorCode.NO_TRADES<a name="error-trades"></a>

Occurs on trying to place a stop order while there is no trade history in the book, hence no market price. It is mandatory to have at least one trade performed in the book so the market price will be established. Orders can only be rejected with this error code; once an order has been accepted, it will never be cancelled with this error code.

```javascript

  const { Book, LimitOrder, StopLimitOrder, EBookErrorCode } = require('dex-book');

  const Book = new Book();

  book.on('order-rejected', (order, reason) => {
    console.log(reason === EBookErrorCode.NO_TRADES); // true
  });

  book.addOrder(new LimitOrder({
    price: '2',
    qty: '2',
    side: 'SELL',
  }));

  book.addOrder(new LimitOrder({
    price: '1',
    qty: '2',
    side: 'BUY'
  }));

  // This order will be rejected
  const result = book.addOrder(new StopLimitOrder({
    id: orderId,
    price: '1',
    limitPrice: '1',
    qty: '3',
    side: 'SELL'
  }));

  console.log(result.orderId); // your-order-id
  console.log(result.isAccepted); // false
  console.log(result.errorCode === EBookErrorCode.NO_TRADES); // true

```

<br/>

#### EBookErrorCode.STOP_PRICE_TOO_HIGH<a name="error-spth"></a>

Occurs on trying to place stop **SELL** order above the current market price. This is forbidden because accepting such order would lead to its immediate execution. Orders can only be rejected with this error code; once an order has been accepted, it will never be cancelled with this error code.

```javascript

  const { Book, LimitOrder, StopMarketOrder, EBookErrorCode } = require('dex-book');

  const Book = new Book();

  book.on('order-rejected', (order, reason) => {
    console.log(reason === EBookErrorCode.STOP_PRICE_TOO_HIGH); // true
  });

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

  // Now market price is equal to 1

  // This order will be rejected, because 1.5 > 1
  const result = book.addOrder(new StopMarketOrder({
    id: 'your-order-id',
    price: '1.5',
    qty: '3',
    side: 'SELL'
  }));

  console.log(result.orderId); // your-order-id
  console.log(result.isAccepted); // false
  console.log(result.errorCode === EBookErrorCode.STOP_PRICE_TOO_HIGH); // true

```

<br/>

#### EBookErrorCode.STOP_PRICE_TOO_LOW<a name="error-sptl"></a>

Occurs on trying to place stop **BUY** order below the current market price. This is forbidden because accepting such order would lead to its immediate execution. Orders can only be rejected with this error code; once an order has been accepted, it will never be cancelled with this error code.

```javascript

  const { Book, LimitOrder, StopMarketOrder, EBookErrorCode } = require('dex-book');

  const Book = new Book();

  book.on('order-rejected', (order, reason) => {
    console.log(reason === EBookErrorCode.STOP_PRICE_TOO_LOW); // true
  });

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

  // Now market price is equal to 1

  // This order will be rejected, because 0.8 < 1
  const result = book.addOrder(new StopMarketOrder({
    id: 'your-order-id',
    price: '0.8',
    qty: '3',
    side: 'BUY'
  }));

  console.log(result.orderId); // your-order-id
  console.log(result.isAccepted); // false
  console.log(result.errorCode === EBookErrorCode.STOP_PRICE_TOO_LOW); // true

```

<br/>

#### EBookErrorCode.WASH_TRADE_DENIED<a name="error-stpf"></a>

> See [Self-Trade Prevention Functionality](#stpf)

Occurs when the order is matched with an opposite order possessing the same *stpfId*. Blocks subsequent order execution as intended to prevent self-trade. This error code can only occur for orders with STPF enabled. An STPF-violating order can be rejected with this code if the very first match of this order detected an opposite order with the same *stpfId*, meaning the newcoming order generated no trades prior to the violation, otherwise (there are already some trades involving this order) the order will be cancelled with this error code.

#### EBookErrorCode.VOLUME_LIMIT_EXCEEDED<a name="error-vlimit"></a>

> See [Volume Limiting](#vlimit)

Occurs for volume-limited market orders which had to be cancelled as their *availableVolume* went to zero. Orders can only be cancelled with this error code; this check is never made before the order is accepted.

#### EBookErrorCode.CUSTOM<a name="error-custom"></a>

Custom error code for user-defined errors. Never occurs in default order implementations - it is meant to be triggered from custom order implementations, for example, inherited from *Order*. The error parameters can be passed in two ways:

* arbitrary data may be attached to meta field of the order
* arbitrary data may be passed as rest parameters to IBookNotifier methods

## TODO (future improvement plan)<a name="todo"></a>

This order book covers the majority of possible demands of general-purpose trading engines. Nevertheless the extension points allow the consumer to implement additional features for the needs of their business. However we would like to make an extra mile and try to provide as much solutions for the common use cases as possible out-of-the-box. Here is the list describing what may be introduced in the feasible future as a part of this product or as a separate library:

* Order time in force support. Currently only GTC (Good-until-cancelled) without time limits is supported. As a starting point we may add:
  * Time limits for GTC (e.g. expiration in 60 or 90 calendar days)
  * FOK (Fill-or-kill) order support
  * IOC (Immediate-or-cancel) order support
* Iceberg order support
* Algorithmic order support
  * Conditional execution
  * Time-based partial execution
  * Conditional cancellation

On top of this, we would like to keep the product quality as high as possible. This includes reliability, extensibility and maintainability, so the possible steps to further improve these will be:

* Adding more integration (functional) test specs for different business scenarios
* Covering the internals with proper unit test specs
* Adding benchmarks
* Rethinking current abstraction layers to be more intuitive for developers without deep domain knowledge
* Making this documentation as concise and consistent as possible
* Running a website with the refined knowledge base for the business domain, the product and surrounding ecosystem

## Documentation<a name="documentation"></a>

```bash
$ npm run docs
```

After running this command the html files with the detailed TypeDoc-generated documentation will appear in the *docs* folder.

## Testing<a name="testing"></a>

```bash
$ npm run test
```

The tests are written using [Jest](https://jestjs.io/) framework.

## Development<a name="development"></a>

To run TypeScript compiler in the watch mode:

```bash
$ npm run dev
```

If you need to run the tests in the watch mode:

```bash
$ ./node_modules/.bin/jest --watch
```
