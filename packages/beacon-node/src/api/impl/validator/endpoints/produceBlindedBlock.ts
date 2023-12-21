import {ServerApi, routes} from "@lodestar/api";
import {allForks, isBlindedBeaconBlock, isBlindedBlockContents} from "@lodestar/types";
import {isForkBlobs} from "@lodestar/params";
import {beaconBlockToBlinded, blobSidecarsToBlinded} from "@lodestar/state-transition";
import {ApiModules} from "../../types.js";
import {ValidatorEndpointDependencies} from "./types.js";

export function buildProduceBlindedBlock(
  {config}: ApiModules,
  {produceBlockV3}: ValidatorEndpointDependencies & {produceBlockV3: ServerApi<routes.validator.Api>["produceBlockV3"]}
): ServerApi<routes.validator.Api>["produceBlindedBlock"] {
  return async function produceBlindedBlock(slot, randaoReveal, graffiti) {
    const producedData = await produceBlockV3(slot, randaoReveal, graffiti);
    let blindedProducedData: routes.validator.ProduceBlindedBlockOrContentsRes;

    if (isForkBlobs(producedData.version)) {
      if (isBlindedBlockContents(producedData.data as allForks.FullOrBlindedBlockContents)) {
        blindedProducedData = producedData as routes.validator.ProduceBlindedBlockOrContentsRes;
      } else {
        //
        const {block, blobSidecars} = producedData.data as allForks.BlockContents;
        const blindedBlock = beaconBlockToBlinded(config, block as allForks.AllForksExecution["BeaconBlock"]);
        const blindedBlobSidecars = blobSidecarsToBlinded(blobSidecars);

        blindedProducedData = {
          ...producedData,
          data: {blindedBlock, blindedBlobSidecars},
        } as routes.validator.ProduceBlindedBlockOrContentsRes;
      }
    } else {
      if (isBlindedBeaconBlock(producedData.data)) {
        blindedProducedData = producedData as routes.validator.ProduceBlindedBlockOrContentsRes;
      } else {
        const block = producedData.data;
        const blindedBlock = beaconBlockToBlinded(config, block as allForks.AllForksExecution["BeaconBlock"]);
        blindedProducedData = {
          ...producedData,
          data: blindedBlock,
        } as routes.validator.ProduceBlindedBlockOrContentsRes;
      }
    }
    return blindedProducedData;
  };
}
