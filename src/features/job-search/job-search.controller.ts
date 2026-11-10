/* job-search — ผูกหน้าหางาน: เปิด modal → รับคลิก → ทอยผล → จ้างงาน/แจ้งผล
   สูตรอยู่ใน job-search.service.ts */
import { life, stats, finance } from '../../core/state';
import { clamp } from '../../core/util';
import { evaluateJobSearch, rollPass } from './job-search.service';
import { renderJobSearchHtml } from './job-search.view';
import type { JobSearchDeps, JobSearchInput } from './job-search.types';

export interface JobSearchFeature {
  open(): void;
}

function currentInput(deps: JobSearchDeps): JobSearchInput {
  const grooming = life.grooming === undefined ? 70 : life.grooming;
  return {
    age: Math.floor(life.ageMonths / 12),
    smarts: stats.smarts,
    social: stats.social,
    grooming: grooming,
    formal: deps.wearingFormal(),
    connection: life.traits.indexOf('มีคอนเนคชัน') >= 0,
    communication: (life.skills && life.skills.communication) || 0,
    tech: (life.skills && life.skills.tech) || 0,
    creativity: (life.skills && life.skills.creativity) || 0
  };
}

export function createJobSearch(deps: JobSearchDeps): JobSearchFeature {
  function fail(message: string, heartLoss: number): void {
    stats.heart = clamp(stats.heart - heartLoss, 0, 100);
    deps.closeModal();
    deps.saveGame();
    deps.updateHud();
    deps.toast(message);
  }

  function markSearched(): void {
    life.flags.jobSearchTurn = deps.currentTurnKey();
  }

  function open(): void {
    if (deps.isPaused() || life.phase !== 'adult') return;
    if (life.flags.retired) { deps.toast('เกษียณแล้ว · ไม่ต้องหางานเพิ่ม'); return; }
    if (finance.salary > 0) { deps.toast('คุณยังมีงานอยู่'); return; }
    if (life.flags.jobSearchTurn === deps.currentTurnKey()) {
      deps.toast('ลองหางานแล้วเทิร์นนี้ · รอเทิร์นหน้า');
      return;
    }

    const input = currentInput(deps);
    const opts = evaluateJobSearch(input);
    deps.openModal(renderJobSearchHtml(opts, input.age, input.formal, input.grooming));

    document.querySelectorAll('[data-choice]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const i = Number(btn.getAttribute('data-choice'));
        if (i === 0) {
          markSearched();
          if (rollPass(opts.chance, deps.rng())) deps.hire(opts.officeSalary, 'office');
          else fail('สัมภาษณ์ไม่ผ่าน · ใจ −3', 3);
        } else if (i === 1) {
          markSearched();
          deps.hire(opts.freeSalary, 'free');
        } else if (i === 3) {
          markSearched();
          if (rollPass(opts.looksChance, deps.rng())) deps.hire(opts.looksSalary, 'looks');
          else fail('แคสติ้งไม่ผ่าน · ใจ −2', 2);
        } else {
          deps.closeModal();
        }
      });
    });
  }

  return { open: open };
}
