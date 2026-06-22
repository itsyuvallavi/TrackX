// Owner: apps/web. Tests for dashboard API base URL resolution.
import { describe, expect, it } from "vitest";
import { resolveApiBaseUrl } from "./api-base-url";

describe("resolveApiBaseUrl", () => {
  it("uses WEB_API_BASE_URL when configured", () => {
    expect(
      resolveApiBaseUrl({
        WEB_API_BASE_URL: "http://api:4001/",
      }),
    ).toBe("http://api:4001");
  });

  it("uses NEXT_PUBLIC_SITE_URL before request headers", () => {
    const requestHeaders = {
      get(name: string) {
        if (name === "x-forwarded-host") {
          return "unexpected.example.com";
        }

        return null;
      },
    };

    expect(
      resolveApiBaseUrl(
        {
          NEXT_PUBLIC_SITE_URL: "https://track-x-web-two.vercel.app/",
        },
        requestHeaders,
      ),
    ).toBe("https://track-x-web-two.vercel.app/api");
  });

  it("uses the incoming request host on Vercel-style forwarded headers", () => {
    const requestHeaders = {
      get(name: string) {
        if (name === "x-forwarded-host") {
          return "track-x-web-two.vercel.app";
        }

        if (name === "x-forwarded-proto") {
          return "https";
        }

        return null;
      },
    };

    expect(resolveApiBaseUrl({}, requestHeaders)).toBe(
      "https://track-x-web-two.vercel.app/api",
    );
  });

  it("uses the first host when x-forwarded-host contains multiple values", () => {
    const requestHeaders = {
      get(name: string) {
        if (name === "x-forwarded-host") {
          return "alias.example.com, internal.example.com";
        }

        if (name === "x-forwarded-proto") {
          return "https";
        }

        return null;
      },
    };

    expect(resolveApiBaseUrl({}, requestHeaders)).toBe(
      "https://alias.example.com/api",
    );
  });

  it("falls back to host when forwarded host is missing", () => {
    const requestHeaders = {
      get(name: string) {
        if (name === "host") {
          return "localhost:3000";
        }

        return null;
      },
    };

    expect(resolveApiBaseUrl({}, requestHeaders)).toBe(
      "http://localhost:3000/api",
    );
  });

  it("uses NEXT_PUBLIC_SITE_URL when request headers are missing", () => {
    expect(
      resolveApiBaseUrl({
        NEXT_PUBLIC_SITE_URL: "https://track-x-web-two.vercel.app/",
      }),
    ).toBe("https://track-x-web-two.vercel.app/api");
  });

  it("defaults to localhost when no env or headers are available", () => {
    expect(resolveApiBaseUrl({})).toBe("http://localhost:3000/api");
  });
});
