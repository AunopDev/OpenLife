/* assets — HTML ของหน้าทรัพย์สิน (ไม่มีตรรกะเกม) */
import { fmt } from '../../core/util';
import { HOME_MAX, CAR_MAX, RENTAL_MAX, INVEST_OPTIONS, DONATE_SMALL, DONATE_BIG, HOME_UPKEEP_PER_LEVEL, CAR_UPKEEP_PER_TIER, RENTAL_UPKEEP_PER_UNIT } from './assets.constants';
import type { AssetsViewModel } from './assets.types';

export function renderAssetsHtml(vm: AssetsViewModel): string {
  const homeBtn = vm.homeCost !== null
    ? '<button class="btn-primary" data-asset="home">อัปเกรดระดับ ' + (vm.homeLevel + 1) + ' · ฿' + fmt(vm.homeCost) + '</button>'
    : '<div class="pay-warn">บ้านถึงระดับสูงสุดแล้ว</div>';

  const carBtn = vm.carTier >= CAR_MAX
    ? '<div class="pay-warn">รถถึงระดับสูงสุดแล้ว</div>'
    : (!vm.carReady
      ? '<div class="pay-warn">ปิดไฟแนนซ์รถก่อนอัปเกรด</div>'
      : '<button class="btn-primary" data-asset="car">อัปเกรดเป็น ' + vm.carName + ' · ฿' + fmt(vm.carCost || 0) + '</button>');

  const rentalBtn = vm.rentalCost !== null
    ? '<button class="btn-primary" data-asset="rental">ซื้อห้องเช่า · ฿' + fmt(vm.rentalCost) + '</button>'
    : '<div class="pay-warn">อสังหาริมทรัพย์ถึงระดับสูงสุดแล้ว</div>';

  const tripRows = vm.tripsList.map(function (t, i) {
    return '<div class="asset-line">' +
      '<div class="asset-info"><b>' + t.name + '</b><span>ใจ +' + Math.round(t.heart * vm.tripMult) +
      ' · สนุก +' + Math.round(t.fun * vm.tripMult) + ' · ของที่ระลึก +1</span></div>' +
      '<button class="btn-ghost" data-trip="' + i + '">฿' + fmt(t.cost) + '</button>' +
      '</div>';
  }).join('');

  const investBtns = INVEST_OPTIONS.map(function (amt) {
    const dis = vm.money < amt ? ' disabled' : '';
    return '<button class="btn-ghost" data-invest="' + amt + '"' + dis + '>ลงทุน ฿' + fmt(amt) + '</button>';
  }).join('');

  return (
    '<div class="ev-head"><span class="ev-chip">ทรัพย์สิน</span><span>เงินสด ฿' + fmt(vm.money) + '</span>' +
    '<button class="ev-x" id="assetX" type="button" aria-label="ปิด">✕</button></div>' +
    '<div class="ev-title">ทรัพย์สินและไลฟ์สไตล์</div>' +
    '<div class="pay-debt">Prestige <b>' + vm.prestige + '</b> · ลงทุน <b>฿' + fmt(vm.invest) + '</b> · ห้องเช่า <b>' + vm.rentals + '</b> · ทริป <b>' + vm.trips + '</b> ครั้ง · บริจาค <b>฿' + fmt(vm.donated) + '</b></div>' +

    '<div class="asset-block"><div class="asset-head"><b>บ้าน</b><span>ระดับ ' + vm.homeLevel + '/' + HOME_MAX + '</span></div>' +
    '<div class="asset-desc">โบนัสใจ +' + vm.homeLevel + '/เดือน · ค่าดูแล ฿' + fmt(vm.homeLevel * HOME_UPKEEP_PER_LEVEL) + '/เดือน</div>' + homeBtn + '</div>' +

    '<div class="asset-block"><div class="asset-head"><b>รถ</b><span>' + (vm.carTier > 0 ? vm.carName : (vm.carReady ? 'ยังไม่มีรถส่วนตัว' : 'รถไฟแนนซ์')) + '</span></div>' +
    '<div class="asset-desc">' + (vm.carTier > 0 ? 'ระดับ ' + vm.carTier + '/' + CAR_MAX + ' · ค่าดูแล ฿' + fmt(vm.carTier * CAR_UPKEEP_PER_TIER) + '/เดือน' : 'อัปเกรดได้เมื่อปิดไฟแนนซ์แล้ว') + '</div>' + carBtn + '</div>' +

    '<div class="asset-block"><div class="asset-head"><b>อสังหาริมทรัพย์ให้เช่า</b><span>' + vm.rentals + '/' + RENTAL_MAX + ' ห้อง</span></div>' +
    '<div class="asset-desc">' + (vm.rentals > 0
      ? 'รายได้ +฿' + fmt(vm.rentalIncome) + '/เดือน · ค่าดูแล ฿' + fmt(vm.rentals * RENTAL_UPKEEP_PER_UNIT) + '/เดือน'
      : 'ซื้อห้องเช่าเพื่อสร้างรายได้ประจำ') + '</div>' + rentalBtn + '</div>' +

    '<div class="asset-block"><div class="asset-head"><b>ธุรกิจ</b><span>' + (vm.businessActive ? vm.businessType + ' · ระดับ ' + vm.businessLevel : 'ยังไม่มี') + '</span></div>' +
    '<div class="asset-desc">' + (vm.businessActive ? 'รายได้ +฿' + fmt(vm.businessMonthly) + '/เดือน' : 'ลงทุนเพื่อสร้างรายได้ระยะยาว') + '</div>' +
    '<button class="btn-primary" data-asset="business">' + (vm.businessActive ? 'จัดการธุรกิจ' : 'เปิดธุรกิจ') + '</button></div>' +

    '<div class="asset-block"><div class="asset-head"><b>การลงทุน</b><span>฿' + fmt(vm.invest) + '</span></div>' +
    '<div class="asset-desc">เติบโตประมาณ 0.3%/เดือน · ถอนได้ทุกเมื่อ</div>' +
    '<div class="asset-actions">' + investBtns +
    '<button class="btn-ghost" data-asset="withdraw"' + (vm.invest > 0 ? '' : ' disabled') + '>ถอนทั้งหมด</button></div></div>' +

    '<div class="asset-block"><div class="asset-head"><b>ทริป / ประสบการณ์</b><span>' + vm.trips + ' ครั้ง</span></div>' +
    '<div class="asset-desc">ผลตอบแทนจะลดลงถ้าไปบ่อยเกินไป (ปัจจุบัน ×' + vm.tripMult.toFixed(2) + ')</div>' + tripRows + '</div>' +

    '<div class="asset-block"><div class="asset-head"><b>บริจาค / มรดกสังคม</b><span>฿' + fmt(vm.donated) + '</span></div>' +
    '<div class="asset-desc">บริจาคเพื่อเพิ่ม legacy และความหมายของชีวิต</div>' +
    '<div class="asset-actions"><button class="btn-primary" data-asset="donate">บริจาค ฿' + fmt(DONATE_SMALL) + '</button>' +
    '<button class="btn-ghost" data-asset="donate5">กองทุนมรดก ฿' + fmt(DONATE_BIG) + '</button></div></div>' +

    '<div class="asset-actions"><button class="btn-ghost" id="assetFinance">← การเงิน</button>' +
    '<button class="btn-ghost" id="assetClose">ปิด</button></div>'
  );
}
