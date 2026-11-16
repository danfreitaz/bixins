import { creatureSvg, eggSvg, itemSvg, dataUri } from "../art";
import { species, items, type Species, type ItemKey } from "../config";
export const manifest = {
  creatures: Object.fromEntries(
    Object.keys(species).map((k) => [
      k,
      {
        idle: dataUri(creatureSvg(k as Species)),
        sleep: dataUri(creatureSvg(k as Species, true)),
        egg: dataUri(eggSvg(k as Species)),
      },
    ]),
  ),
  items: Object.fromEntries(
    Object.keys(items).map((k) => [k, dataUri(itemSvg(k as ItemKey))]),
  ),
};
