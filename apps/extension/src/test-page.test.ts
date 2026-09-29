import { describe, expect, it } from "vitest";
import { isFocusLitTestPageUrl } from "./test-page";

describe("FocusLit test-page scope", () => {
  it("accepts only the local fixture path", () => {
    expect(
      isFocusLitTestPageUrl(
        "file:///Users/example/focuslit/apps/extension/focuslit-test-page/index.html",
      ),
    ).toBe(true);
  });

  it("rejects a remote URL that merely mentions the fixture path", () => {
    expect(
      isFocusLitTestPageUrl(
        "https://example.test/?next=/focuslit-test-page/index.html",
      ),
    ).toBe(false);
  });

  it("does not treat a query-string mention as the local fixture", () => {
    expect(
      isFocusLitTestPageUrl(
        "file:///Users/example/notes.html?next=/focuslit-test-page/index.html",
      ),
    ).toBe(false);
  });

  it("rejects other files inside a folder with the fixture's name", () => {
    expect(
      isFocusLitTestPageUrl(
        "file:///Users/example/Downloads/focuslit-test-page/other.html",
      ),
    ).toBe(false);
  });
});
