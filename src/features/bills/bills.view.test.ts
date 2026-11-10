import { describe, it, expect } from 'vitest';
import { renderBillsHtml } from './bills.view';
import { BILL_IDS } from './bills.constants';

const base = {
  dateLabel: 'จ. 1 ม.ค. 2569',
  breakdown: { months: 3, rent: 16500, utility: 5400, lifestyle: 7920, total: 29820 },
  money: 50000,
  paid: false,
  autoBills: false
};

describe('renderBillsHtml', function () {
  it('ยังไม่จ่าย → มีปุ่มจ่ายเงินสด/ผ่อนบัตร และยอดรวมคั่นหลักพัน', function () {
    const html = renderBillsHtml(base);
    expect(html).toContain('id="' + BILL_IDS.payCash + '"');
    expect(html).toContain('id="' + BILL_IDS.payCard + '"');
    expect(html).toContain('฿29,820');
    expect(html).toContain('(3 เดือน)');
    expect(html).toContain('เปิดหักบิลอัตโนมัติ');
  });
  it('จ่ายแล้ว → ไม่มีปุ่มจ่าย แสดงสถานะจ่ายแล้ว', function () {
    const html = renderBillsHtml(Object.assign({}, base, { paid: true, autoBills: true }));
    expect(html).not.toContain(BILL_IDS.payCash);
    expect(html).toContain('จ่ายแล้วเทิร์นนี้');
    expect(html).toContain('ปิดหักบิลอัตโนมัติ');
  });
});
