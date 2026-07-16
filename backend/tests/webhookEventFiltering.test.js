import test from "node:test";
import assert from "node:assert/strict";

const webhookMatchesEvent = (
  webhook,
  event
) => {
  return webhook.events.includes(
    event
  );
};

test(
  "matching event returns true",
  () => {
    const webhook = {
      events: [
        "document.uploaded",
        "payment.success",
      ],
    };

    assert.equal(
      webhookMatchesEvent(
        webhook,
        "payment.success"
      ),
      true
    );
  }
);

test(
  "non matching event returns false",
  () => {
    const webhook = {
      events: [
        "document.uploaded",
      ],
    };

    assert.equal(
      webhookMatchesEvent(
        webhook,
        "review.completed"
      ),
      false
    );
  }
);