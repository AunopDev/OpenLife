/* assets — public API ของ feature ทรัพย์สิน/ไลฟ์สไตล์ */
export type { AssetsDeps, AssetsViewModel, ActionResult, AssetTrip } from './assets.types';
export type { AssetsFeature } from './assets.controller';
export { createAssets } from './assets.controller';
export {
  assetPrestige,
  tripMultiplier,
  buildAssetsViewModel,
  buyHome,
  buyCar,
  buyRental,
  invest,
  withdraw,
  donate,
  takeTrip
} from './assets.service';
export { HOME_COSTS } from './assets.constants';
