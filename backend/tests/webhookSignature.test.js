import test from "node:test";
import assert from "node:assert";

import {
  generateWebhookSignature,
  verifyWebhookSignature,
} from "../services/webhookSignatureService.js";

test(
  "webhook signature generates correctly",
  () => {
    const payload = {
      name: "TaxBee",
    };

    const secret =
      "super-secret";

    const signature =
      generateWebhookSignature(
        payload,
        secret
      );

    assert.ok(signature);
  }
);

test(
  "webhook signature verifies correctly",
  () => {
    const payload = {
      amount: 1000,
    };

    const secret =
      "taxbee-secret";

    const signature =
      generateWebhookSignature(
        payload,
        secret
      );

    const valid =
      verifyWebhookSignature(
        payload,
        secret,
        signature
      );

    assert.equal(
      valid,
      true
    );
  }
);

test(
  "invalid signature fails",
  () => {
    const valid =
      verifyWebhookSignature(
        {
          amount: 1000,
        },
        "secret",
        "fake-signature"
      );

    assert.equal(
      valid,
      false
    );
  }
);