/* business — ผูกหน้าธุรกิจ: เปิด modal → รับคลิก → เรียก service → toast/save/HUD
   ไม่มีสูตรคำนวณที่นี่ (อยู่ใน business.service.ts) */
import { BUSINESS_OPTIONS } from './business.constants';
import { buildBusinessViewModel, startBusiness, upgradeBusiness } from './business.service';
import { renderBusinessPicker, renderBusinessPanel } from './business.view';
import type { BusinessActionResult, BusinessDeps } from './business.types';

export interface BusinessFeature {
  /** เปิดหน้าธุรกิจ (เลือกเปิดใหม่ หรือจัดการสาขาที่มี) */
  open(): void;
}

export function createBusiness(deps: BusinessDeps): BusinessFeature {
  function finish(r: BusinessActionResult): void {
    if (!r.ok) { deps.toast(r.message); return; }
    if (r.achievement) deps.addAchievement(r.achievement.id, r.achievement.label);
    deps.saveGame();
    deps.closeModal();
    deps.updateHud();
    deps.toast(r.message);
  }

  function on(id: string, fn: () => void): void {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }

  function open(): void {
    if (deps.isPaused()) return;
    const vm = buildBusinessViewModel();

    if (!vm.active) {
      deps.openModal(renderBusinessPicker(BUSINESS_OPTIONS, vm.money));
      on('bizClose', deps.closeModal);
      document.querySelectorAll('[data-biz]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          finish(startBusiness(Number(btn.getAttribute('data-biz')) || 0));
        });
      });
      return;
    }

    deps.openModal(renderBusinessPanel(vm));
    on('bizClose', deps.closeModal);
    on('bizUpgrade', function () { finish(upgradeBusiness()); });
  }

  return { open: open };
}
