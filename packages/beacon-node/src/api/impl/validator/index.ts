import {ServerApi, routes} from "@lodestar/api";
import {GENESIS_SLOT, SLOTS_PER_HISTORICAL_ROOT} from "@lodestar/params";
import {CachedBeaconStateAllForks} from "@lodestar/state-transition";
import {Root} from "@lodestar/types";
import {ZERO_HASH} from "../../../constants/index.js";
import {ApiModules} from "../types.js";
import {buildGetAggregatedAttestation} from "./endpoints/getAggregatedAttestation.js";
import {buildGetAttesterDuties} from "./endpoints/getAttesterDuties.js";
import {buildGetLiveness} from "./endpoints/getLiveness.js";
import {buildGetProposerDuties} from "./endpoints/getProposerDuties.js";
import {buildGetSyncCommitteeDuties} from "./endpoints/getSyncCommitteeDuties.js";
import {buildPrepareBeaconCommitteeSubnet} from "./endpoints/prepareBeaconCommitteeSubnet.js";
import {buildPrepareBeaconProposer} from "./endpoints/prepareBeaconProposer.js";
import {buildPrepareSyncCommitteeSubnets} from "./endpoints/prepareSyncCommitteeSubnets.js";
import {buildProduceAttestationData} from "./endpoints/produceAttestationData.js";
import {buildProduceBlindedBlock} from "./endpoints/produceBlindedBlock.js";
import {buildProduceBlock} from "./endpoints/produceBlock.js";
import {buildProduceBlockV2} from "./endpoints/produceBlockV2.js";
import {buildProduceBlockV3} from "./endpoints/produceBlockV3.js";
import {buildProduceSyncCommitteeContribution} from "./endpoints/produceSyncCommitteeContribution.js";
import {buildPublishAggregateAndProofs} from "./endpoints/publishAggregateAndProofs.js";
import {buildPublishContributionAndProofs} from "./endpoints/publishContributionAndProofs.js";
import {buildRegisterValidator} from "./endpoints/registerValidator.js";
import {buildSubmitBeaconCommitteeSelections} from "./endpoints/submitBeaconCommitteeSelections.js";
import {buildSubmitSyncCommitteeSelections} from "./endpoints/submitSyncCommitteeSelections.js";
import {isNodeSynced, isValidBeaconBlockRoot} from "./utils.js";

/**
 * If the node is within this many epochs from the head, we declare it to be synced regardless of
 * the network sync state.
 *
 * This helps prevent attacks where nodes can convince us that we're syncing some non-existent
 * finalized head.
 *
 * TODO: Lighthouse uses 8 for the attack described above. However, 8 kills Lodestar since validators
 * can trigger regen to fast-forward head state 8 epochs to be immediately invalidated as sync sets
 * a new head. Then the checkpoint state cache grows unbounded with very different states (because
 * they are 8 epochs apart) and causes an OOM. Research a proper solution once regen and the state
 * caches are better.
 */
const SYNC_TOLERANCE_EPOCHS = 1;

/**
 * Server implementation for handling validator duties.
 * See `@lodestar/validator/src/api` for the client implementation).
 */
export function getValidatorApi(modules: ApiModules): ServerApi<routes.validator.Api> {
  const {chain, config, sync} = modules;
  let genesisBlockRoot: Root | null = null;

  /**
   * Validator clock may be advanced from beacon's clock. If the validator requests a resource in a
   * future slot, wait some time instead of rejecting the request because it's in the future.
   * This value is the same to MAXIMUM_GOSSIP_CLOCK_DISPARITY_SEC.
   * For very fast networks, reduce clock disparity to half a slot.
   */
  const MAX_API_CLOCK_DISPARITY_SEC = Math.min(0.5, config.SECONDS_PER_SLOT / 2);
  const MAX_API_CLOCK_DISPARITY_MS = MAX_API_CLOCK_DISPARITY_SEC * 1000;

  /**
   * If advancing the local clock `MAX_API_CLOCK_DISPARITY_MS` ticks to the requested slot, wait for its start
   * Prevents the validator from getting errors from the API if the clock is a bit advanced
   */
  async function waitForSlotWithDisparity(slot: number): Promise<void> {
    if (chain.clock.isCurrentSlotGivenTolerance(slot, 0, MAX_API_CLOCK_DISPARITY_MS)) {
      return chain.clock.waitForSlot(slot);
    }

    throw Error(`Requested slot ${slot} is in the future`);
  }

  function notWhileSyncing(): void {
    isNodeSynced({
      headSlot: chain.forkChoice.getHead().slot,
      currentSlot: chain.clock.currentSlot,
      syncState: sync.state,
      syncToleranceEpochs: SYNC_TOLERANCE_EPOCHS,
      raiseErrors: true,
    });
  }

  function notOnOptimisticBlockRoot(root: Root): void {
    isValidBeaconBlockRoot({forkChoice: chain.forkChoice, beaconBlockRoot: root});
  }

  /**
   * Compute and cache the genesis block root
   */
  async function getGenesisBlockRoot(state: CachedBeaconStateAllForks): Promise<Root> {
    if (!genesisBlockRoot) {
      // Close to genesis the genesis block may not be available in the DB
      if (state.slot < SLOTS_PER_HISTORICAL_ROOT) {
        genesisBlockRoot = state.blockRoots.get(0);
      }

      const blockRes = await chain.getCanonicalBlockAtSlot(GENESIS_SLOT);
      if (blockRes) {
        genesisBlockRoot = config
          .getForkTypes(blockRes.block.message.slot)
          .SignedBeaconBlock.hashTreeRoot(blockRes.block);
      }
    }

    // If for some reason the genesisBlockRoot is not able don't prevent validators from
    // proposing or attesting. If the genesisBlockRoot is wrong, at worst it may trigger a re-fetch of the duties
    return genesisBlockRoot || ZERO_HASH;
  }

  const deps = {
    notOnOptimisticBlockRoot,
    notWhileSyncing,
    waitForSlotWithDisparity,
    getGenesisBlockRoot,
    maxClockDisparityMs: MAX_API_CLOCK_DISPARITY_MS,
  };

  const produceBlockV2 = buildProduceBlockV2(modules, deps);
  const produceBlock = buildProduceBlock(modules, {...deps, produceBlockV2});
  const produceBlockV3 = buildProduceBlockV3(modules, {...deps, produceBlockV2});
  const produceBlindedBlock = buildProduceBlindedBlock(modules, {...deps, produceBlockV3});
  const produceAttestationData = buildProduceAttestationData(modules, deps);
  const produceSyncCommitteeContribution = buildProduceSyncCommitteeContribution(modules, deps);
  const getProposerDuties = buildGetProposerDuties(modules, deps);
  const getAttesterDuties = buildGetAttesterDuties(modules, deps);
  const getSyncCommitteeDuties = buildGetSyncCommitteeDuties(modules, deps);
  const getAggregatedAttestation = buildGetAggregatedAttestation(modules, deps);
  const publishAggregateAndProofs = buildPublishAggregateAndProofs(modules, deps);
  const publishContributionAndProofs = buildPublishContributionAndProofs(modules, deps);
  const prepareBeaconCommitteeSubnet = buildPrepareBeaconCommitteeSubnet(modules, deps);
  const prepareSyncCommitteeSubnets = buildPrepareSyncCommitteeSubnets(modules, deps);
  const getLiveness = buildGetLiveness(modules, deps);
  const registerValidator = buildRegisterValidator(modules, deps);
  const prepareBeaconProposer = buildPrepareBeaconProposer(modules, deps);
  const submitBeaconCommitteeSelections = buildSubmitBeaconCommitteeSelections(modules, deps);
  const submitSyncCommitteeSelections = buildSubmitSyncCommitteeSelections(modules, deps);

  return {
    produceBlock,
    produceBlockV2,
    produceBlockV3,
    produceBlindedBlock,
    produceAttestationData,
    produceSyncCommitteeContribution,
    getProposerDuties,
    getAttesterDuties,
    getSyncCommitteeDuties,
    getAggregatedAttestation,
    publishAggregateAndProofs,
    publishContributionAndProofs,
    prepareBeaconCommitteeSubnet,
    prepareSyncCommitteeSubnets,
    getLiveness,
    registerValidator,
    prepareBeaconProposer,
    submitBeaconCommitteeSelections,
    submitSyncCommitteeSelections,
  };
}
