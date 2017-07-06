const expect = require("chai").expect;
const router = require("../src/router");
const sinon = require("sinon");
const Stripe = require("stripe");
const stream = require("stream");
const StripeSignatureVerificationError = require("stripe/lib/Error").StripeSignatureVerificationError;
const request = require("supertest");
const express = require("express");

const stripe = Stripe("key");

describe("router", function () {
    describe("setUp", function () {
        it("Throws if no webhook url is provided", function () {
            expect(router.bind(null, {
                processors: {type: () => null},
                stripeKey: "abc"
            })).to.throw()
        });
        it("Throws if no processors provided", function () {
            expect(router.bind(null, {
                webhookUrl: "/path",
                stripeKey: "abc"
            })).to.throw()
        });
        it("Doesn't throw if correct options are passed in", function () {
            expect(router.bind(null, {
                processors: {type: () => null},
                webhookUrl: "/path",
                stripeKey: "abc"
            })).to.not.throw()
        });
    });

    describe("event processing", function () {

        beforeEach(function () {
            sinon.stub(stripe.webhooks, "constructEvent").callsFake((body) => {
                return JSON.parse(body);
            });
        });

        afterEach(function () {
            stripe.webhooks.constructEvent.restore();
        });

        it("Validates header", function (done) {
            const app = express();
            app.use(router({
                processors: {"customer.source.created": () => Promise.resolve()},
                webhookUrl: "/path",
                webhookSecret: "secret",
                stripeKey: "abdc"
            }));
            request(app)
                .post("/path")
                .send({type: "customer.source.created"})
                .expect(200)
                .end((err) => {
                    if (err) {
                        return done(err);
                    }
                    sinon.assert.calledOnce(stripe.webhooks.constructEvent);
                    done();
                });

        });

        it("Doesn't validate header if no secret provided", function (done) {
            const app = express();
            app.use(router({
                processors: {"customer.source.created": () => Promise.resolve()},
                webhookUrl: "/path",
                stripeKey: "abdc"
            }));
            request(app)
                .post("/path")
                .send({type: "customer.source.created"})
                .expect(200)
                .end((err) => {
                    if (err) {
                        return done(err);
                    }
                    sinon.assert.notCalled(stripe.webhooks.constructEvent);
                    done();
                });
        });

        it("Returns 400 if header check fails", function (done) {
            stripe.webhooks.constructEvent.restore();
            sinon.stub(stripe.webhooks, "constructEvent").callsFake(() => {
                throw new StripeSignatureVerificationError("Error");
            });

            const app = express();
            app.use(router({
                processors: {"customer.source.created": () => Promise.resolve()},
                webhookUrl: "/path",
                stripeKey: "abdc",
                webhookSecret: "secret"
            }));
            request(app)
                .post("/path")
                .send({type: "customer.source.created"})
                .expect(400, done);
        });

        it("Returns 501 if processor is not defined for type", function (done) {
            const app = express();
            app.use(router({
                processors: {"customer.source.created": () => Promise.resolve()},
                webhookUrl: "/path",
                webhookSecret: "secret",
                stripeKey: "abdc"
            }));
            request(app)
                .post("/path")
                .send({type: "customer.source.deleted"})
                .expect(501, done);
        });
    });

});
