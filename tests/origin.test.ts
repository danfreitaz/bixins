import { it, expect } from "vitest";
import { sameOrigin } from "../src/lib/same-origin";
it("aceita o host público mesmo quando o Next usa localhost internamente", () => {
  expect(
    sameOrigin(
      new Request("http://localhost:3001/api/game", {
        headers: { host: "127.0.0.1:3001", origin: "http://127.0.0.1:3001" },
      }),
    ),
  ).toBe(true);
});
it("bloqueia origem externa, inválida e forwarded host forjado", () => {
  for (const origin of ["https://outro.example", "not-a-url"])
    expect(
      sameOrigin(
        new Request("https://bixins.example/api/game", {
          headers: {
            host: "bixins.example",
            origin,
            "x-forwarded-host": "outro.example",
          },
        }),
      ),
    ).toBe(false);
});
