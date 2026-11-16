import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient, exchangeCodeForSession } = vi.hoisted(() => ({
  createClient: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}));

vi.mock("@/app/lib/supabase/server", () => ({ createClient }));

import { NextRequest } from "next/server";
import { GET } from "@/app/auth/callback/route";

function makeRequest(query: string) {
  return new NextRequest(`http://localhost/auth/callback${query}`);
}

describe("authentication callback destination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exchangeCodeForSession.mockResolvedValue({ error: null });
    createClient.mockResolvedValue({
      auth: { exchangeCodeForSession },
    });
  });

  it("routes a verified recovery callback to password reset", async () => {
    const response = await GET(
      makeRequest("?code=auth-code&next=%2Fauth%2Frecover"),
    );

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/auth/recover",
    );
    expect(exchangeCodeForSession).toHaveBeenCalledWith("auth-code");
  });

  it("does not accept an external callback destination", async () => {
    const response = await GET(
      makeRequest("?code=auth-code&next=https%3A%2F%2Fevil.example"),
    );

    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/auth/continue",
    );
  });

  it("returns to login when no authentication code is provided", async () => {
    const response = await GET(makeRequest(""));

    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
    expect(createClient).not.toHaveBeenCalled();
  });
});
