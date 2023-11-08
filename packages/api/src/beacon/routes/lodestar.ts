import {Epoch, RootHex, Slot} from "@lodestar/types";
import {Schema, Endpoint, RouteDefinitions, ResponseCodec, AnyPostEndpoint, AnyGetEndpoint} from "../../utils/index.js";
import {
  EmptyArgs,
  EmptyGetRequestCodec,
  EmptyMeta,
  EmptyPostRequestCodec,
  EmptyRequest,
  EmptyResponseCodec,
  EmptyResponseData,
  JsonOnlyResponseCodec,
} from "../../utils/codecs.js";
import {FilterGetPeers, NodePeer, PeerDirection, PeerState} from "./node.js";

// See /packages/api/src/routes/index.ts for reasoning and instructions to add new routes

export type SyncChainDebugState = {
  targetRoot: string | null;
  targetSlot: number | null;
  syncType: string;
  status: string;
  startEpoch: number;
  peers: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  batches: any[];
};

export type GossipQueueItem = {
  topic: unknown;
  propagationSource: string;
  data: Uint8Array;
  addedTimeMs: number;
  seenTimestampSec: number;
};

export type PeerScoreStat = {
  peerId: string;
  lodestarScore: number;
  gossipScore: number;
  ignoreNegativeGossipScore: boolean;
  score: number;
  lastUpdate: number;
};

export type GossipPeerScoreStat = {
  peerId: string;
  // + Other un-typed options
};

export type RegenQueueItem = {
  key: string;
  args: unknown;
  addedTimeMs: number;
};

export type BlockProcessorQueueItem = {
  blockSlots: Slot[];
  jobOpts: Record<string, string | number | boolean | undefined>;
  addedTimeMs: number;
};

export type StateCacheItem = {
  slot: Slot;
  root: RootHex;
  /** Total number of reads */
  reads: number;
  /** Unix timestamp (ms) of the last read */
  lastRead: number;
  checkpointState: boolean;
};

export type LodestarNodePeer = NodePeer & {
  agentVersion: string;
};

export type LodestarThreadType = "main" | "network" | "discv5";

export type Endpoints = {
  /** Trigger to write a heapdump to disk at `dirpath`. May take > 1min */
  writeHeapdump: Endpoint<
    //
    "POST",
    {dirpath?: string},
    {query: {dirpath?: string}},
    {filepath: string},
    EmptyMeta
  >;
  /** Trigger to write 10m network thread profile to disk */
  writeProfile: Endpoint<
    "POST",
    {
      thread?: LodestarThreadType;
      duration?: number;
      dirpath?: string;
    },
    {query: {thread?: LodestarThreadType; duration?: number; dirpath?: string}},
    {filepath: string},
    EmptyMeta
  >;
  /** TODO: description */
  getLatestWeakSubjectivityCheckpointEpoch: Endpoint<
    //
    "GET",
    EmptyArgs,
    EmptyRequest,
    Epoch,
    EmptyMeta
  >;
  /** TODO: description */
  getSyncChainsDebugState: Endpoint<
    //
    "GET",
    EmptyArgs,
    EmptyRequest,
    SyncChainDebugState[],
    EmptyMeta
  >;
  /** Dump all items in a gossip queue, by gossipType */
  getGossipQueueItems: Endpoint<
    //
    "GET",
    {gossipType: string},
    {params: {gossipType: string}},
    unknown[],
    EmptyMeta
  >;
  /** Dump all items in the regen queue */
  getRegenQueueItems: Endpoint<
    //
    "GET",
    EmptyArgs,
    EmptyRequest,
    RegenQueueItem[],
    EmptyMeta
  >;
  /** Dump all items in the block processor queue */
  getBlockProcessorQueueItems: Endpoint<
    //
    "GET",
    EmptyArgs,
    EmptyRequest,
    BlockProcessorQueueItem[],
    EmptyMeta
  >;
  /** Dump a summary of the states in the StateContextCache */
  getStateCacheItems: Endpoint<
    //
    "GET",
    EmptyArgs,
    EmptyRequest,
    StateCacheItem[],
    EmptyMeta
  >;
  /** Dump peer gossip stats by peer */
  getGossipPeerScoreStats: Endpoint<
    //
    "GET",
    EmptyArgs,
    EmptyRequest,
    GossipPeerScoreStat[],
    EmptyMeta
  >;
  /** Dump lodestar score stats by peer */
  getLodestarPeerScoreStats: Endpoint<
    //
    "GET",
    EmptyArgs,
    EmptyRequest,
    PeerScoreStat[],
    EmptyMeta
  >;
  /** Run GC with `global.gc()` */
  runGC: Endpoint<
    //
    "POST",
    EmptyArgs,
    EmptyRequest,
    EmptyResponseData,
    EmptyMeta
  >;
  /** Drop all states in the state cache */
  dropStateCache: Endpoint<
    //
    "POST",
    EmptyArgs,
    EmptyRequest,
    EmptyResponseData,
    EmptyMeta
  >;

  /** Connect to peer at this multiaddress */
  connectPeer: Endpoint<
    //
    "POST",
    {peerId: string; multiaddrs: string[]},
    {query: {peerId: string; multiaddr: string[]}},
    EmptyResponseData,
    EmptyMeta
  >;
  /** Disconnect peer */
  disconnectPeer: Endpoint<
    //
    "POST",
    {peerId: string},
    {query: {peerId: string}},
    EmptyResponseData,
    EmptyMeta
  >;
  /** Same to node api with new fields */
  getPeers: Endpoint<
    //
    "GET",
    {filters?: FilterGetPeers},
    {query: {state?: PeerState[]; direction?: PeerDirection[]}},
    LodestarNodePeer[],
    {count: number}
  >;

  /** Dump Discv5 Kad values */
  discv5GetKadValues: Endpoint<
    //
    "GET",
    EmptyArgs,
    EmptyRequest,
    string[],
    EmptyMeta
  >;

  /**
   * Dump level-db entry keys for a given Bucket declared in code, or for all buckets.
   * @param bucket must be the string name of a bucket entry: `allForks_blockArchive`
   */
  dumpDbBucketKeys: Endpoint<
    //
    "GET",
    {bucket: string},
    {params: {bucket: string}},
    string[],
    EmptyMeta
  >;

  /** Return all entries in the StateArchive index with bucket index_stateArchiveRootIndex */
  dumpDbStateIndex: Endpoint<
    //
    "GET",
    EmptyArgs,
    EmptyRequest,
    {root: RootHex; slot: Slot}[],
    EmptyMeta
  >;
};

/**
 * Define javascript values for each route
 */
export const definitions: RouteDefinitions<Endpoints> = {
  writeHeapdump: {
    url: "/eth/v1/lodestar/write_heapdump",
    method: "POST",
    req: {
      writeReqJson: ({dirpath}) => ({query: {dirpath}}),
      parseReqJson: ({query}) => ({dirpath: query.dirpath}),
      writeReqSsz: ({dirpath}) => ({query: {dirpath}, body: new Uint8Array()}),
      parseReqSsz: ({query}) => ({dirpath: query.dirpath}),
      schema: {query: {dirpath: Schema.String}},
    },
    resp: JsonOnlyResponseCodec as ResponseCodec<AnyPostEndpoint>,
  },
  writeProfile: {
    url: "/eth/v1/lodestar/write_profile",
    method: "POST",
    req: {
      writeReqJson: ({thread, duration, dirpath}) => ({query: {thread, duration, dirpath}}),
      parseReqJson: ({query}) => ({thread: query.thread, duration: query.duration, dirpath: query.dirpath}),
      writeReqSsz: ({thread, duration, dirpath}) => ({query: {thread, duration, dirpath}, body: new Uint8Array()}),
      parseReqSsz: ({query}) => ({thread: query.thread, duration: query.duration, dirpath: query.dirpath}),
      schema: {query: {dirpath: Schema.String}},
    },
    resp: JsonOnlyResponseCodec as ResponseCodec<AnyPostEndpoint>,
  },
  getLatestWeakSubjectivityCheckpointEpoch: {
    url: "/eth/v1/lodestar/ws_epoch",
    method: "GET",
    req: EmptyGetRequestCodec,
    resp: JsonOnlyResponseCodec as ResponseCodec<AnyGetEndpoint>,
  },
  getSyncChainsDebugState: {
    url: "/eth/v1/lodestar/sync_chains_debug_state",
    method: "GET",
    req: EmptyGetRequestCodec,
    resp: JsonOnlyResponseCodec as ResponseCodec<AnyGetEndpoint>,
  },
  getGossipQueueItems: {
    url: "/eth/v1/lodestar/gossip_queue_items/:gossipType",
    method: "GET",
    req: {
      writeReq: ({gossipType}) => ({params: {gossipType}}),
      parseReq: ({params}) => ({gossipType: params.gossipType}),
      schema: {params: {gossipType: Schema.StringRequired}},
    },
    resp: JsonOnlyResponseCodec as ResponseCodec<AnyGetEndpoint>,
  },
  getRegenQueueItems: {
    url: "/eth/v1/lodestar/regen_queue_items",
    method: "GET",
    req: EmptyGetRequestCodec,
    resp: JsonOnlyResponseCodec as ResponseCodec<AnyGetEndpoint>,
  },
  getBlockProcessorQueueItems: {
    url: "/eth/v1/lodestar/block_processor_queue_items",
    method: "GET",
    req: EmptyGetRequestCodec,
    resp: JsonOnlyResponseCodec as ResponseCodec<AnyGetEndpoint>,
  },
  getStateCacheItems: {
    url: "/eth/v1/lodestar/state_cache_items",
    method: "GET",
    req: EmptyGetRequestCodec,
    resp: JsonOnlyResponseCodec as ResponseCodec<AnyGetEndpoint>,
  },
  getGossipPeerScoreStats: {
    url: "/eth/v1/lodestar/gossip_peer_score_stats",
    method: "GET",
    req: EmptyGetRequestCodec,
    resp: JsonOnlyResponseCodec as ResponseCodec<AnyGetEndpoint>,
  },
  getLodestarPeerScoreStats: {
    url: "/eth/v1/lodestar/lodestar_peer_score_stats",
    method: "GET",
    req: EmptyGetRequestCodec,
    resp: JsonOnlyResponseCodec as ResponseCodec<AnyGetEndpoint>,
  },
  runGC: {
    url: "/eth/v1/lodestar/gc",
    method: "POST",
    req: EmptyPostRequestCodec,
    resp: EmptyResponseCodec as ResponseCodec<AnyPostEndpoint>,
  },
  dropStateCache: {
    url: "/eth/v1/lodestar/drop_state_cache",
    method: "POST",
    req: EmptyPostRequestCodec,
    resp: EmptyResponseCodec as ResponseCodec<AnyPostEndpoint>,
  },
  connectPeer: {
    url: "/eth/v1/lodestar/connect_peer",
    method: "POST",
    req: {
      writeReqJson: ({peerId, multiaddrs}) => ({query: {peerId, multiaddr: multiaddrs}}),
      parseReqJson: ({query}) => ({peerId: query.peerId, multiaddrs: query.multiaddr}),
      writeReqSsz: ({peerId, multiaddrs}) => ({query: {peerId, multiaddr: multiaddrs}, body: new Uint8Array()}),
      parseReqSsz: ({query}) => ({peerId: query.peerId, multiaddrs: query.multiaddr}),
      schema: {query: {peerId: Schema.StringRequired, multiaddr: Schema.StringArray}},
    },
    resp: EmptyResponseCodec as ResponseCodec<AnyPostEndpoint>,
  },
  disconnectPeer: {
    url: "/eth/v1/lodestar/disconnect_peer",
    method: "POST",
    req: {
      writeReqJson: ({peerId}) => ({query: {peerId}}),
      parseReqJson: ({query}) => ({peerId: query.peerId}),
      writeReqSsz: ({peerId}) => ({query: {peerId}, body: new Uint8Array()}),
      parseReqSsz: ({query}) => ({peerId: query.peerId}),
      schema: {query: {peerId: Schema.StringRequired}},
    },
    resp: EmptyResponseCodec as ResponseCodec<AnyPostEndpoint>,
  },
  getPeers: {
    url: "/eth/v1/lodestar/peers",
    method: "GET",
    req: {
      writeReq: ({filters}) => ({query: filters ?? {}}),
      parseReq: ({query}) => ({filters: query}),
      schema: {query: {state: Schema.StringArray, direction: Schema.StringArray}},
    },
    resp: JsonOnlyResponseCodec as ResponseCodec<AnyGetEndpoint>,
  },
  discv5GetKadValues: {
    url: "/eth/v1/debug/discv5_kad_values",
    method: "GET",
    req: EmptyGetRequestCodec,
    resp: JsonOnlyResponseCodec as ResponseCodec<AnyGetEndpoint>,
  },
  dumpDbBucketKeys: {
    url: "/eth/v1/debug/dump_db_bucket_keys/:bucket",
    method: "GET",
    req: {
      writeReq: ({bucket}) => ({params: {bucket}}),
      parseReq: ({params}) => ({bucket: params.bucket}),
      schema: {params: {bucket: Schema.String}},
    },
    resp: JsonOnlyResponseCodec as ResponseCodec<AnyGetEndpoint>,
  },
  dumpDbStateIndex: {
    url: "/eth/v1/debug/dump_db_state_index",
    method: "GET",
    req: EmptyGetRequestCodec,
    resp: JsonOnlyResponseCodec as ResponseCodec<AnyGetEndpoint>,
  },
};
