/* business — public API ของ feature ธุรกิจ */
export type { BusinessDeps, BusinessViewModel, BusinessActionResult, BusinessOption } from './business.types';
export type { BusinessFeature } from './business.controller';
export { createBusiness } from './business.controller';
export { businessState, startBusiness, upgradeBusiness, upgradeCost, buildBusinessViewModel } from './business.service';
export { BUSINESS_OPTIONS, BUSINESS_MAX_LEVEL } from './business.constants';
