# stripe-webhook-processor
> Process stripe webhook events in your express app

## Installation 
```bash
npm install stripe-webhook-processor
```

## Usage

```js

var StripeWebhookProcessor = require("stripe-webhook-processor");
var express = require("express");

var app = express();

app.use(StripeWebhookProcessor({
        processors: {"charge.succeeded": [() => {}]}, // Add functions to be called when an event of type is received
        webhookUrl: "/stripe/webhook", // Path to mount webhook middleware at
        webhookSecret: "abcd", // OPTIONAL Your stripe webhookSecret.  Required for webhook-signing validation
        stripeKey: config.get("stripe.secretKey") // Your secret stripe api key
 }));
```

## Notes

- Currently an error is thrown if the webhook receives an event which it does not have a processor registered for
