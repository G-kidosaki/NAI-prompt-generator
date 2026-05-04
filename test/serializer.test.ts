import { describe, it, expect } from "vitest";
import { serializeV3 } from "../src/lib/serializer/v3";
import { serializeV4 } from "../src/lib/serializer/v4";
import { serializeRandomizer, parseRandomizer } from "../src/lib/randomizer";
import { v3WeightToNumeric, numericToV3Weight } from "../src/lib/weight";
import type { Composition, Library, Tag } from "../src/lib/types";

const tag = (over: Partial<Tag> = {}): Tag => ({
  id: "t",
  text: "x",
  weight: { kind: "v3", w: 0 },
  role: "none",
  neg: false,
  ...over,
});

describe("serializeV3 (legacy)", () => {
  const lib: Library = {
    cats: [
      { id: "a", name: "A", order: 0, tags: [] },
      { id: "b", name: "B", order: 1, tags: [] },
    ],
    prompts: [
      { id: "p1", catId: "a", prompt: "1girl", label: "", tagIds: [], order: 0 },
      { id: "p2", catId: "a", prompt: "smile", label: "", tagIds: [], order: 1 },
      { id: "p3", catId: "b", prompt: "lowres", label: "", tagIds: [], order: 0 },
    ],
    sels: {
      p1: { w: 0, neg: false },
      p2: { w: 2, neg: false },
      p3: { w: 1, neg: true },
    },
  };

  it("emits {} / [] wrapping in cat order", () => {
    const r = serializeV3(lib);
    expect(r.pos).toBe("1girl, {{smile}}");
    expect(r.neg).toBe("{lowres}");
  });
});

describe("serializeV4 — base only", () => {
  const make = (over: Partial<Composition> = {}): Composition => ({
    id: "c",
    name: "",
    model: "v4",
    base: { positives: [], negatives: [] },
    characters: [],
    meta: {},
    updatedAt: 0,
    schemaVersion: 4,
    ...over,
  });

  it("joins positives by comma", () => {
    const c = make({
      base: {
        positives: [tag({ text: "1girl" }), tag({ text: "smile" })],
        negatives: [],
      },
    });
    expect(serializeV4(c).pos).toBe("1girl, smile");
  });

  it("applies numeric weight", () => {
    const c = make({
      base: {
        positives: [tag({ text: "blue eyes", weight: { kind: "numeric", n: 1.3 } })],
        negatives: [],
      },
    });
    expect(serializeV4(c).pos).toBe("1.3::blue eyes::");
  });

  it("applies negative numeric weight", () => {
    const c = make({
      base: {
        positives: [tag({ text: "closed eyes", weight: { kind: "numeric", n: -1 } })],
        negatives: [],
      },
    });
    expect(serializeV4(c).pos).toBe("-1::closed eyes::");
  });

  it("emits role prefix in V4", () => {
    const c = make({
      base: {
        positives: [tag({ text: "kissing", role: "source" })],
        negatives: [],
      },
    });
    expect(serializeV4(c).pos).toBe("source#kissing");
  });

  it("does not emit role prefix in V3 fallback", () => {
    const c = make({
      model: "v3",
      base: {
        positives: [tag({ text: "kissing", role: "source" })],
        negatives: [],
      },
    });
    // v3 model in V4 serializer drops role prefix
    expect(serializeV4(c).pos).toBe("kissing");
  });

  it("expands randomizer", () => {
    const c = make({
      base: {
        positives: [tag({ text: "ignored", random: { variants: ["red hair", "blue hair"] } })],
        negatives: [],
      },
    });
    expect(serializeV4(c).pos).toBe("||red hair|blue hair||");
  });
});

describe("serializeV4 — characters with || separators", () => {
  it("joins base + 2 characters with ' || '", () => {
    const c: Composition = {
      id: "c", name: "", model: "v4",
      base: {
        positives: [tag({ text: "2girls" })],
        negatives: [tag({ text: "lowres", neg: true })],
      },
      characters: [
        {
          id: "ch1", enabled: true, positives: [tag({ text: "kirisame marisa" })],
          negatives: [tag({ text: "blurry", neg: true })],
        },
        {
          id: "ch2", enabled: true, positives: [tag({ text: "hakurei reimu" })],
          negatives: [],
        },
      ],
      meta: {}, updatedAt: 0, schemaVersion: 4,
    };
    const r = serializeV4(c);
    expect(r.pos).toBe("2girls || kirisame marisa || hakurei reimu");
    expect(r.neg).toBe("lowres || blurry");
    expect(r.perCharacter).toEqual([
      { pos: "kirisame marisa", neg: "blurry", bias: null },
      { pos: "hakurei reimu", neg: "", bias: null },
    ]);
  });

  it("skips disabled characters", () => {
    const c: Composition = {
      id: "c", name: "", model: "v4",
      base: { positives: [tag({ text: "base" })], negatives: [] },
      characters: [
        { id: "ch1", enabled: false, positives: [tag({ text: "drop" })], negatives: [] },
        { id: "ch2", enabled: true, positives: [tag({ text: "keep" })], negatives: [] },
      ],
      meta: {}, updatedAt: 0, schemaVersion: 4,
    };
    expect(serializeV4(c).pos).toBe("base || keep");
  });
});

describe("randomizer", () => {
  it("serializes 2+ variants", () => {
    expect(serializeRandomizer(["red", "blue", "green"])).toBe("||red|blue|green||");
  });
  it("returns single value for 1-element list", () => {
    expect(serializeRandomizer(["alone"])).toBe("alone");
  });
  it("parses ||a|b||", () => {
    expect(parseRandomizer("||red|blue||")).toEqual(["red", "blue"]);
  });
  it("rejects single-variant ||x||", () => {
    expect(parseRandomizer("||red||")).toBeNull();
  });
  it("rejects non-randomizer text", () => {
    expect(parseRandomizer("plain text")).toBeNull();
  });
});

describe("weight conversion roundtrip", () => {
  it("v3 → numeric → v3 stays close", () => {
    for (const w of [-3, -1, 0, 1, 2, 3]) {
      const n = v3WeightToNumeric(w);
      const w2 = numericToV3Weight(n);
      expect(w2).toBe(w);
    }
  });
  it("0 maps to 1.0", () => {
    expect(v3WeightToNumeric(0)).toBe(1);
  });
});
