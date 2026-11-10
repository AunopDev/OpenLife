/* job-search — public API ของ feature หางาน */
export type { JobSearchDeps, JobSearchInput, JobSearchOptions } from './job-search.types';
export type { JobSearchFeature } from './job-search.controller';
export { createJobSearch } from './job-search.controller';
export {
  evaluateJobSearch,
  officeChance,
  officeSalary,
  freeSalary,
  looksEligible,
  looksSalary,
  looksChance,
  rollPass
} from './job-search.service';
