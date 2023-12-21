import {CachedBeaconStateAllForks} from "@lodestar/state-transition";
import {Root, Slot} from "@lodestar/types";

export interface ValidatorEndpointDependencies {
  waitForSlotWithDisparity(slot: Slot): Promise<void>;
  notWhileSyncing(): void;
  notOnOptimisticBlockRoot(root: Root): void;
  getGenesisBlockRoot(state: CachedBeaconStateAllForks): Promise<Root>;
  maxClockDisparityMs: number;
}
