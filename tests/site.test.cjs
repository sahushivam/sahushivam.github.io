const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../js/site.js"), "utf8");

function setupDialog() {
  class Element extends EventTarget {
    focus() { this.focused = true; }
  }
  const trigger = new Element();
  trigger.dataset = { dialog: "project" };
  const closeButton = new Element();

  class Dialog extends Element {
    open = false;
    showModal() { this.open = true; }
    close() { this.open = false; }
    querySelectorAll() { return [closeButton]; }
    getBoundingClientRect() { return { left: 100, top: 100, right: 500, bottom: 400 }; }
  }
  const dialog = new Dialog();
  const body = { style: { overflow: "" } };
  vm.runInNewContext(source, {
    HTMLDialogElement: Dialog,
    document: {
      body,
      querySelector: () => null,
      getElementById: id => id === "project" ? dialog : null,
      querySelectorAll: selector => selector === "[data-dialog]" ? [trigger] : [dialog]
    }
  });
  trigger.dispatchEvent(new Event("click"));
  return { dialog, trigger, closeButton, body };
}

function clickDialog(dialog, target, clientX, clientY) {
  const event = new Event("click");
  Object.defineProperties(event, {
    target: { value: target },
    clientX: { value: clientX },
    clientY: { value: clientY }
  });
  dialog.dispatchEvent(event);
}

test("clicking a dialog's interior padding keeps it open and the page locked", () => {
  const { dialog, body } = setupDialog();
  clickDialog(dialog, dialog, 110, 200);
  assert.equal(dialog.open, true);
  assert.equal(body.style.overflow, "hidden");
});

test("bubbled keyboard activation of dialog content is not a backdrop click", () => {
  const { dialog, body } = setupDialog();
  clickDialog(dialog, new EventTarget(), 0, 0);
  assert.equal(dialog.open, true);
  assert.equal(body.style.overflow, "hidden");
});

test("clicking outside the dialog closes it and restores scroll and focus", () => {
  const { dialog, trigger, body } = setupDialog();
  clickDialog(dialog, dialog, 90, 200);
  assert.equal(dialog.open, false);
  assert.equal(body.style.overflow, "");
  assert.equal(trigger.focused, true);
});

test("the close button still closes the dialog and restores scroll and focus", () => {
  const { dialog, trigger, closeButton, body } = setupDialog();
  closeButton.dispatchEvent(new Event("click"));
  assert.equal(dialog.open, false);
  assert.equal(body.style.overflow, "");
  assert.equal(trigger.focused, true);
});

test("Escape cleanup preserves the browser's native cancel behavior", () => {
  const { dialog, trigger, body } = setupDialog();
  const event = new Event("cancel", { cancelable: true });
  dialog.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false);
  assert.equal(body.style.overflow, "");
  assert.equal(trigger.focused, true);
});
