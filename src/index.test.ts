import Dereferencer from "./index";
import { Properties, JSONSchemaObject } from "@json-schema-tools/meta-schema";

describe("Dereferencer", () => {

  it("can be constructed", () => {
    const dereferencer = new Dereferencer({});
    expect(dereferencer).toBeInstanceOf(Dereferencer);
  });

  it("simple dereffing", async () => {
    const dereferencer = new Dereferencer({
      type: "object",
      properties: {
        foo: { type: "string" },
        bar: { $ref: "#/properties/foo" },
        fromFile: { $ref: "./src/test-schema.json" },
      },
    });
    const dereffed = await dereferencer.resolve() as JSONSchemaObject;
    const props = dereffed.properties as Properties;
    expect(props.bar).toBe(props.foo);
    expect(props.fromFile).not.toBe(props.bar);
    expect(props.fromFile).not.toBe(props.foo);
    expect(props.fromFile.type).toBe("string");
  });

  it("can ref other refs", async () => {
    const dereferencer = new Dereferencer({
      type: "object",
      properties: {
        foo: { type: "string" },
        bar: { $ref: "#/properties/foo" },
        baz: { $ref: "#/properties/bar" },
      },
    });
    const dereffed = await dereferencer.resolve() as JSONSchemaObject;
    const props = dereffed.properties as Properties;
    expect(props.bar).toBe(props.foo);
    expect(props.baz).toBe(props.foo);
    expect(props.baz).toBe(props.bar);
  });

  it("order doesnt matter", async () => {
    const dereferencer = new Dereferencer({
      type: "object",
      properties: {
        bar: { $ref: "#/properties/foo" },
        foo: { $ref: "./src/test-schema.json" },
        baz: { $ref: "#/properties/bar" },
      },
    });
    const dereffed = await dereferencer.resolve() as JSONSchemaObject;
    const props = dereffed.properties as Properties;
    expect(props.bar).toBe(props.foo);
    expect(props.baz).toBe(props.foo);
    expect(props.baz).toBe(props.bar);
    expect(props.baz.type).toBe("string");
  });

  it("can handle recursively dereffing", async () => {
    expect.assertions(4);
    const dereferencer = new Dereferencer({
      type: "object",
      properties: {
        jsonSchemaMetaSchema: {
          $ref: "https://raw.githubusercontent.com/json-schema-tools/meta-schema/master/src/schema.json",
        },
      },
    });
    const dereffed = await dereferencer.resolve() as JSONSchemaObject;
    const props = dereffed.properties as Properties;

    const oneOfs = props.jsonSchemaMetaSchema.oneOf as JSONSchemaObject[];
    expect(oneOfs).toBeInstanceOf(Array);

    const oProp = oneOfs[0].properties as Properties;
    expect(oProp.maxLength.title)
      .toBe("nonNegativeInteger");

    expect(oProp.minItems.title)
      .toBe("nonNegativeIntegerDefaultZero");

    expect(oProp.dependencies.additionalProperties.anyOf[0])
      .toBe(props.jsonSchemaMetaSchema);
  });

  it("can deal with root refs-to-ref as url", async () => {
    expect.assertions(7);
    const dereferencer = new Dereferencer({
      $ref: "https://raw.githubusercontent.com/json-schema-tools/meta-schema/master/src/schema.json",
    });
    const dereffed = await dereferencer.resolve() as JSONSchemaObject;
    expect(dereffed).toBeDefined();
    expect(dereffed.oneOf).toBeInstanceOf(Array);

    const oneOfs = dereffed.oneOf as JSONSchemaObject[];

    expect(oneOfs[0].type).toBe("object");
    expect(oneOfs[1].type).toBe("boolean");
    expect((oneOfs[0].properties as Properties).additionalItems).toBe(dereffed);
    expect(
      (oneOfs[0].properties as Properties).minProperties.title
    ).toBe("nonNegativeIntegerDefaultZero");
    expect(dereffed.definitions).toBeUndefined();
  });

  it("can deal with root refs-to-ref as file", async () => {
    const dereferencer = new Dereferencer({
      $ref: "./src/test-schema-1.json",
    });
    const { type } = await dereferencer.resolve() as JSONSchemaObject;
    expect(type).toBe("string");
  });
});
