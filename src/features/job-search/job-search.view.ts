/* job-search — HTML ของหน้าหางาน (ไม่มีตรรกะเกม) */
import { fmt } from '../../core/util';
import type { JobSearchOptions } from './job-search.types';

export function renderJobSearchHtml(opts: JobSearchOptions, age: number, formal: boolean, grooming: number): string {
  let choices = '';
  choices += '<button class="choice" data-choice="0"><span class="c-label">1. สมัครงานออฟฟิศ (โอกาส ' + opts.chance + '%)</span>' +
    '<span class="c-hint"><span class="hint up">เงินเดือน ~฿' + fmt(opts.officeSalary) + '</span><span class="hint req">เสี่ยงไม่ผ่าน</span></span></button>';
  choices += '<button class="choice" data-choice="1"><span class="c-label">2. รับงานฟรีแลนซ์/พาร์ทไทม์</span>' +
    '<span class="c-hint"><span class="hint up">ได้แน่ ~฿' + fmt(opts.freeSalary) + '</span><span class="hint down">ไม่มีสวัสดิการ</span></span></button>';
  if (opts.looksOk) {
    choices += '<button class="choice" data-choice="3"><span class="c-label">3. สมัครงานนายแบบ/นักแสดง/อินฟลูเอนเซอร์ (โอกาส ' + opts.looksChance + '%)</span>' +
      '<span class="c-hint"><span class="hint up">~฿' + fmt(opts.looksSalary) + '</span><span class="hint req">ใช้ลุค + ความเรียบร้อย + ความสร้างสรรค์</span></span></button>';
  }
  choices += '<button class="choice" data-choice="2"><span class="c-label">' + (opts.looksOk ? '4' : '3') + '. พักก่อน</span></button>';

  return (
    '<div class="ev-head"><span class="ev-chip">หางาน</span><span>อายุ ' + age + ' ปี</span></div>' +
    '<div class="ev-title">ตกงาน — จะไปทางไหนต่อ?</div>' +
    '<div class="ev-text">เรซูเม่ถูกส่งไปหลายที่ แต่ตลาดงานอายุ 45+ ไม่ได้ใจดีกับใคร<br>' +
    'การแต่งตัว: <b>' + (formal ? 'สุภาพ (เชิ้ต/เบลาส์)' : 'ลำลอง') + '</b> · ความเรียบร้อย <b>' + Math.round(grooming) + '</b>/100</div>' +
    '<div class="choices">' + choices + '</div>'
  );
}
