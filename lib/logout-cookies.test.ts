import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import { expirePiperyAuthCookies } from "./logout-cookies";

function expireNames(response: NextResponse) {
  return response.headers
    .getSetCookie()
    .map(cookie => cookie.split("=")[0]);
}

describe("expirePiperyAuthCookies", () => {
  it("expires selected provider cookies and legacy cookies", () => {
    const response = new NextResponse();
    const request = new Request("https://start.pipery.dev", {
      headers: {
        cookie: "__Secure-pipery-auth.github.session-token=abc; __Secure-pipery-auth.gitlab.session-token=def"
      }
    });

    expirePiperyAuthCookies(response, request, "github");

    const names = expireNames(response);
    expect(names).toContain("__Secure-pipery-auth.github.session-token");
    expect(names).toContain("__Secure-next-auth.session-token");
    expect(names).not.toContain("__Secure-pipery-auth.gitlab.session-token");
  });

  it("expires all provider cookies when provider is omitted", () => {
    const response = new NextResponse();
    expirePiperyAuthCookies(response, new Request("https://start.pipery.dev"));

    const names = expireNames(response);
    expect(names).toContain("__Secure-pipery-auth.github.session-token");
    expect(names).toContain("__Secure-pipery-auth.gitlab.session-token");
    expect(names).toContain("__Secure-pipery-auth.bitbucket.session-token");
  });

  it("does not add Domain to __Host cookies", () => {
    const response = new NextResponse();
    expirePiperyAuthCookies(response, new Request("https://start.pipery.dev"), "github");

    const hostCookies = response.headers
      .getSetCookie()
      .filter(cookie => cookie.startsWith("__Host-pipery-auth.csrf-token="));
    expect(hostCookies.length).toBe(1);
    expect(hostCookies[0]).not.toContain("Domain=");
  });
});
