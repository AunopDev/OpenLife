/* assets — ผูกหน้าทรัพย์สิน: เปิด modal → รับคลิก → เรียก service → toast/save/HUD
   ไม่มีสูตรคำนวณที่นี่ (อยู่ใน assets.service.ts) */
import {
  buildAssetsViewModel, buildHomeUpgradeViewModel, buyHome, buyCar, buyRental, invest, withdraw, donate, takeTrip
} from './assets.service';
import { renderAssetsHtml, renderHomeUpgradeHtml } from './assets.view';
import type { ActionResult, AssetsDeps } from './assets.types';

export interface AssetsFeature {
  /** เปิดหน้าทรัพย์สิน (ไม่ทำอะไรถ้าเกมหยุดอยู่) */
  open(): void;
  /** เปิดหน้าปรับปรุงบ้านแบบเฉพาะจุด */
  openHome(): void;
}

export function createAssets(deps: AssetsDeps): AssetsFeature {
  const effects = { addNeed: deps.addNeed, gainSkill: deps.gainSkill };

  function refresh(): void {
    const m = deps.getModal();
    const keepScroll = m ? m.scrollTop : 0;
    deps.closeModal();
    open();
    const m2 = deps.getModal();
    if (m2) m2.scrollTop = keepScroll;
  }

  function finish(r: ActionResult, reopen?: () => void): void {
    if (!r.ok) { deps.toast(r.message); return; }
    (r.achievements || []).forEach(function (a) { deps.addAchievement(a.id, a.label); });
    deps.saveGame();
    deps.updateHud();
    (reopen || refresh)();
    deps.toast(r.message);
  }

  function on(id: string, fn: () => void): void {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }

  function open(): void {
    if (deps.isPaused()) return;
    deps.openModal(renderAssetsHtml(buildAssetsViewModel()));

    on('assetClose', deps.closeModal);
    on('assetX', deps.closeModal);
    on('assetFinance', function () {
      deps.closeModal();
      deps.openFinance();
    });

    const m = deps.getModal();
    if (!m) return;

    m.querySelectorAll('[data-asset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const what = btn.getAttribute('data-asset');
        if (what === 'home') finish(buyHome());
        else if (what === 'car') finish(buyCar());
        else if (what === 'rental') finish(buyRental());
        else if (what === 'withdraw') finish(withdraw());
        else if (what === 'donate') finish(donate(1000000));
        else if (what === 'donate5') finish(donate(5000000));
        else if (what === 'business') {
          deps.closeModal();
          deps.openBusiness();
        }
      });
    });

    m.querySelectorAll('[data-invest]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        finish(invest(Number(btn.getAttribute('data-invest')) || 0));
      });
    });

    m.querySelectorAll('[data-trip]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        finish(takeTrip(Number(btn.getAttribute('data-trip')), effects));
      });
    });
  }

  function openHome(): void {
    if (deps.isPaused()) return;
    deps.openModal(renderHomeUpgradeHtml(buildHomeUpgradeViewModel()));
    on('homeClose', deps.closeModal);
    on('homeUp', function () { finish(buyHome(), openHome); });
  }

  return { open: open, openHome: openHome };
}
