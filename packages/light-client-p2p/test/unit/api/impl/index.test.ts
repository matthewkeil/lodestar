import {SinonSandbox, SinonStubbedInstance} from "sinon";
import sinon from "sinon";
import {config} from "@lodestar/config/default";
import {ForkChoice} from "@lodestar/fork-choice";
import {IChainForkConfig} from "@lodestar/config";
import {Network} from "@lodestar/beacon-node/network";
import {getBeaconBlockApi} from "../../../../src/api/impl/beacon/blocks/index.js";
import {LightChain} from "../../../../src/chain/index.js";
import {LightNodeSync} from "../../../../src/sync/index.js";
import {StubbedBeaconDb, StubbedChainMutable} from "../../../utils/stub/index.js";

type StubbedChain = StubbedChainMutable<"forkChoice" | "clock">;

export type ApiImplTestModules = {
  sandbox: SinonSandbox;
  forkChoiceStub: SinonStubbedInstance<ForkChoice>;
  chainStub: StubbedChain;
  syncStub: SinonStubbedInstance<LightNodeSync>;
  dbStub: StubbedBeaconDb;
  networkStub: SinonStubbedInstance<Network>;
  blockApi: ReturnType<typeof getBeaconBlockApi>;
  config: IChainForkConfig;
};

export function setupApiImplTestServer(): ApiImplTestModules {
  const sandbox = sinon.createSandbox();
  const forkChoiceStub = sinon.createStubInstance(ForkChoice);
  const chainStub = sinon.createStubInstance(LightChain) as StubbedChain;
  const syncStub = sinon.createStubInstance(LightNodeSync);
  const dbStub = new StubbedBeaconDb(config);
  const networkStub = sinon.createStubInstance(Network);
  const blockApi = getBeaconBlockApi({
    chain: chainStub,
    config,
    db: dbStub,
    network: networkStub,
    metrics: null,
  });
  chainStub.forkChoice = forkChoiceStub;
  return {
    sandbox,
    forkChoiceStub,
    chainStub,
    syncStub,
    dbStub,
    networkStub,
    blockApi,
    config,
  };
}