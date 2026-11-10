/* business — HTML ของหน้าธุรกิจ (ไม่มีตรรกะเกม) */
import { fmt } from '../../core/util';
import type { BusinessOption, BusinessViewModel } from './business.types';

export function renderBusinessPicker(options: BusinessOption[], money: number): string {
  const rows = options.map(function (o, i) {
    return '<button class="choice" data-biz="' + i + '"><span class="c-label">' + o.type + '</span>' +
      '<span class="c-hint"><span class="hint down">ลงทุน ฿' + fmt(o.cost) + '</span>' +
      '<span class="hint up">+฿' + fmt(o.monthly) + '/เดือน</span></span></button>';
  }).join('');
  return (
    '<div class="ev-head"><span class="ev-chip">ธุรกิจ</span><span>ลงทุนได้ครั้งเดียว</span></div>' +
    '<div class="ev-title">เปิดธุรกิจของตัวเอง</div>' +
    '<div class="pay-debt">เงินสด <b>฿' + fmt(money) + '</b> · รายได้จะเข้ากระเป๋าทุกเทิร์น</div>' +
    '<div class="choices">' + rows + '</div>' +
    '<button class="btn-ghost" id="bizClose">ยังไม่เปิด</button>'
  );
}

export function renderBusinessPanel(vm: BusinessViewModel): string {
  const canUpgrade = vm.level < vm.maxLevel;
  return (
    '<div class="ev-head"><span class="ev-chip">ธุรกิจ</span><span>ระดับ ' + vm.level + '</span></div>' +
    '<div class="ev-title">' + vm.type + '</div>' +
    '<div class="pay-table">' +
    '<div class="pay-row"><span>รายได้ต่อเดือน</span><span class="pos">+' + fmt(vm.monthly) + '</span></div>' +
    '<div class="pay-row"><span>เงินลงทุนสะสม</span><span>' + fmt(vm.invested) + '</span></div>' +
    '</div>' +
    (canUpgrade
      ? '<button class="btn-primary" id="bizUpgrade">อัปเกรด ฿' + fmt(vm.upgradeCost) + ' (+40% รายได้)</button>'
      : '<div class="pay-warn">ธุรกิจถึงระดับสูงสุดแล้ว</div>') +
    '<button class="btn-ghost" id="bizClose">ปิด</button>'
  );
}
