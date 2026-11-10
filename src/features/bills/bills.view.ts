/* bills — สร้าง HTML ของหน้าบิล (ไม่มีตรรกะเกม: รับ view model ที่คำนวณแล้ว)
   markup/class เดิมจาก game.ts (pay-table, pay-row, ...) เพื่อใช้ style เดิม */
import { fmt } from '../../core/util';
import { BILL_IDS } from './bills.constants';
import type { BillsViewModel } from './bills.types';

function row(label: string, value: string, cls?: string): string {
  return '<div class="pay-row' + (cls ? ' ' + cls : '') + '"><span>' + label + '</span><b>' + value + '</b></div>';
}

export function renderBillsHtml(vm: BillsViewModel): string {
  const b = vm.breakdown;
  return (
    '<div class="ev-head"><span class="ev-chip">บิลที่อยู่</span><span>' + vm.dateLabel + '</span></div>' +
    '<div class="ev-title">ค่าเช่า / ค่าครองชีพ</div>' +
    '<div class="pay-table">' +
    row('ค่าเช่า/ที่อยู่ (' + b.months + ' เดือน)', '฿' + fmt(b.rent), 'neg') +
    row('ค่าน้ำค่าไฟ/ค่าครองชีพ', '฿' + fmt(b.utility), 'neg') +
    row('ค่าใช้จ่ายตามรายได้ (12%)', '฿' + fmt(b.lifestyle), 'neg') +
    '<div class="pay-total"><span>รวมบิลเทิร์นนี้</span><b>฿' + fmt(b.total) + '</b></div>' +
    '</div>' +
    '<div class="pay-debt">เงินสด <b>฿' + fmt(vm.money) + '</b> · ' +
    (vm.paid ? '<b style="color:#6ee7a8">จ่ายแล้วเทิร์นนี้</b>' : 'ยังไม่จ่าย — ถ้าปล่อยค้างจะทบเข้าบัตรเครดิต') +
    '</div>' +
    (!vm.paid
      ? '<button class="btn-primary" id="' + BILL_IDS.payCash + '">จ่ายเงินสด ฿' + fmt(b.total) + '</button>' +
        '<button class="btn-ghost" id="' + BILL_IDS.payCard + '">ผ่อนเข้าบัตรเครดิต</button>'
      : '') +
    '<button class="btn-ghost" id="' + BILL_IDS.toggleAuto + '">' + (vm.autoBills ? 'ปิด' : 'เปิด') + 'หักบิลอัตโนมัติ</button>' +
    '<button class="btn-ghost" id="' + BILL_IDS.close + '">ปิด</button>'
  );
}
