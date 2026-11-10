/* bills — ผูกหน้าบิล: เปิด modal → รับคลิก → เรียก service → toast/บันทึก/HUD
   ไม่มีสูตรคำนวณที่นี่ (อยู่ใน bills.service.ts) */
import { life, stats } from '../../core/state';
import { fmt } from '../../core/util';
import { BILL_IDS } from './bills.constants';
import { billBreakdown, billsPaidThisTurn, payBillsCash, payBillsCard, toggleAutoBills } from './bills.service';
import { renderBillsHtml } from './bills.view';
import type { BillsDeps } from './bills.types';

export interface BillsFeature {
  /** เปิดหน้าบิลที่อยู่ (ไม่ทำอะไรถ้าเกมหยุดอยู่) */
  open(): void;
}

export function createBills(deps: BillsDeps): BillsFeature {
  function on(id: string, fn: () => void) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }

  function finish(message: string) {
    deps.saveGame();
    deps.closeModal();
    deps.updateHud();
    deps.toast(message);
  }

  function open(): void {
    if (deps.isPaused()) return;
    const breakdown = billBreakdown();
    deps.openModal(renderBillsHtml({
      dateLabel: deps.dateLabel(),
      breakdown: breakdown,
      money: stats.money,
      paid: billsPaidThisTurn(),
      autoBills: !!life.flags.autoBills
    }));

    on(BILL_IDS.close, deps.closeModal);
    on(BILL_IDS.payCash, function () {
      const r = payBillsCash(breakdown);
      if (!r.ok) { deps.toast('เงินไม่พอจ่ายบิล ฿' + fmt(r.amount)); return; }
      finish('จ่ายบิลที่อยู่แล้ว ฿' + fmt(r.amount));
    });
    on(BILL_IDS.payCard, function () {
      const amount = payBillsCard(breakdown);
      finish('ผ่อนบิลเข้าบัตรเครดิต ฿' + fmt(amount) + ' · เครดิต −3');
    });
    on(BILL_IDS.toggleAuto, function () {
      const enabled = toggleAutoBills();
      deps.saveGame();
      deps.closeModal();
      deps.toast(enabled ? 'เปิดหักบิลอัตโนมัติแล้ว' : 'ปิดหักบิลอัตโนมัติแล้ว');
      open();
    });
  }

  return { open: open };
}
