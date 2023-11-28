import {WireFormat} from "./headers.js";
import {SchemaDefinition} from "./schema.js";

export type PathParams = Record<string, string | number>;
export type QueryParams = Record<string, string | number | (string | number)[]>;
export type HeaderParams = Record<string, string>;

export type GetRequestData<
  P extends PathParams = PathParams,
  Q extends QueryParams = QueryParams,
  H extends HeaderParams = HeaderParams,
> = {
  params?: P;
  query?: Q;
  headers?: H;
};

export type JsonPostRequestData<
  B = unknown,
  P extends PathParams = PathParams,
  Q extends QueryParams = QueryParams,
  H extends HeaderParams = HeaderParams,
> = GetRequestData<P, Q, H> & {
  body?: B;
};

export type SszPostRequestData<P extends JsonPostRequestData> = Omit<P, "body"> & {
  body: P["body"] extends undefined ? undefined : Uint8Array;
};

export type HttpMethod = "GET" | "POST" | "DELETE";

/**
 * This type describes the general shape of a route
 * This includes both http and application-level shape
 * - The http method
 *   - Used to more strictly enforce the shape of the request
 * - The application-level parameters
 *   - this enforces the shape of the input data passed by the client and to the route handler
 * - The http request
 *   - this enforces the shape of the querystring, url params, request body
 * - The application-level return data
 *   - this enforces the shape of the output data passed back to the client and returned by the route handler
 * - The application-level return metadata
 *   - this enforces the shape of the returned metadata, used informationally and to help decode the return data
 */
export type Endpoint<
  Method extends HttpMethod = HttpMethod,
  ArgsType = unknown,
  RequestType extends Method extends "GET" ? GetRequestData : JsonPostRequestData = GetRequestData,
  ReturnType = unknown,
  Meta = unknown,
> = {
  method: Method;
  /** the parameters the client passes / server app code ingests */
  args: ArgsType;
  /** the parameters in the http request */
  request: RequestType;
  /** the return data */
  return: ReturnType;
  /** the return metadata */
  meta: Meta;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEndpoint = Endpoint<HttpMethod, any, any, any, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyPostEndpoint = Endpoint<"POST", any, any, any, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGetEndpoint = Endpoint<"GET", any, any, any, any>;

// Request codec

/** Encode / decode requests to & from function params, as well as schema definitions */
export type GetRequestCodec<E extends Endpoint> = {
  writeReq: (p: E["args"]) => E["request"]; // for the client
  parseReq: (r: E["request"]) => E["args"]; // for the server
  schema: SchemaDefinition<E["request"]>;
};

export type PostRequestCodec<E extends Endpoint> = {
  writeReqJson: (p: E["args"]) => E["request"];
  parseReqJson: (r: E["request"]) => E["args"];
  writeReqSsz: (p: E["args"]) => SszPostRequestData<E["request"]>;
  parseReqSsz: (r: SszPostRequestData<E["request"]>) => E["args"];
  schema: SchemaDefinition<E["request"]>;
  /** Support ssz-only or json-only requests */
  onlySupport?: WireFormat;
};

/**
 * Previously called ReqSerializer
 * this handles translating between Endpoint["args"] and Endpoint["request"]
 *
 * TODO: Should this be split into separate serialize and deserialize + schema objects?
 * For separate consumption by client and server.
 * Taking this idea to the extreme, Each group of endpoints would have definitions split into three files for nice treeshaking (types, client, server)
 */
export type RequestCodec<E extends Endpoint> = E["method"] extends "GET" ? GetRequestCodec<E> : PostRequestCodec<E>;

// Response codec

export type ResponseDataCodec<T, M> = {
  toJson: (data: T, meta: M) => unknown; // server
  fromJson: (data: unknown, meta: M) => T; // client
  serialize: (data: T, meta: M) => Uint8Array; // server
  deserialize: (data: Uint8Array, meta: M) => T; // client
};

export type ResponseMetadataCodec<T> = {
  toJson: (val: T) => unknown; // server
  fromJson: (val: unknown) => T; // client
  toHeadersObject: (val: T) => Record<string, string>; // server
  fromHeaders: (val: Headers) => T; // server
};

export type ResponseCodec<E extends Endpoint> = {
  data: ResponseDataCodec<E["return"], E["meta"]>;
  meta: ResponseMetadataCodec<E["meta"]>;
  /** Occasionally, json responses require an extra transormation to separate the data from metadata */
  transform?: {
    toResponse: (data: unknown, meta: unknown) => unknown;
    fromResponse: (resp: unknown) => {
      data: unknown;
      meta: unknown;
    };
  };
  /** Support ssz-only or json-only responses */
  onlySupport?: WireFormat;
};

/**
 * Top-level definition of a route used by both the client and server
 * - url and method
 * - request and response codec
 * - request json schema
 */
export type RouteDefinition<E extends AnyEndpoint> = {
  url: string;
  method: E["method"];
  // TODO remove?
  statusOk?: number; // only used for keymanager to set non-200 ok
  req: RequestCodec<E>;
  resp: ResponseCodec<E>;
};

export type RouteDefinitions<Es extends Record<string, AnyEndpoint>> = {[K in keyof Es]: RouteDefinition<Es[K]>};
