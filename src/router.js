const express = require("express");
const Stripe = require("stripe");
const StripeSignatureVerificationError = require("stripe/lib/Error").StripeSignatureVerificationError;
const getRawBody = require("raw-body");
const Promise = require("bluebird");
const stream = require("stream");

const init = (options) => {
    validateOptions(options);
    const router = express.Router();

    const processors = options.processors;

    const stripe = Stripe(options.stripeSecret);
    router.post(options.webhookUrl, (req, res) => {
        getRawBody(req, {
            encoding: "'utf8'"
        }).then(function (body) {
            const event = options.webhookSecret ? stripe.webhooks.constructEvent(
                body,
                req.headers["stripe-signature"],
                options.webhookSecret
            ) : JSON.parse(body);

            if (!processors[event.type]) {
                return res.sendStatus(501);
            }
            const processorsForType = typeof processors[event.type] === "function" ? [processors[event.type]] : processors[event.type];
            return Promise.map(processorsForType, processor => {
                return processor(event);
            }).then(() => {
                res.sendStatus(200);
            });

        }).catch(function (err) {
            if (err instanceof StripeSignatureVerificationError) {
                return res.status(400).send({
                    errors: [{
                        status: 400,
                        title: "Signature verification error",
                        details: err.message
                    }]
                });
            }
            res.status(500).send({
                errors: [{
                    status: 500,
                    title: "Error processing event",
                    details: err.message
                }]
            });
        });
    });
    return router;
};

const validateOptions = options => {
    if (!options.webhookUrl) {
        throw new Error("Must provide webhookUrl");
    }

    if (!options.processors) {
        throw new Error("Must provide one or more event processors");
    }

    if (!options.stripeKey) {
        throw new Error("Must provide stripeKey");
    }
};

module.exports = init;
