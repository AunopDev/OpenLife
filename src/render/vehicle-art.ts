/* render/vehicle-art — รถ top-down ที่ 32px art (Phase 3)
   ขนาด ~76×34 art px (~2.4 × 1.1 tile) ใหญ่กว่าตัวละคร ~1.4 เท่า ตาม docs/rules/art.md
   พิกัด (x, y) = กึ่งกลางรถ · axis 'h' = ตามแนวนอน, 'v' = ตามแนวตั้ง · dir 1 = บวก, -1 = ลบ */

export interface CarLook {
  color: string;
  axis: 'h' | 'v';
  dir: 1 | -1;
}

/** ปรับความสว่างของสี hex (factor < 1 = เข้มขึ้น, > 1 = สว่างขึ้น) */
function shade(hex: string, factor: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) {
    return Math.max(0, Math.min(255, Math.round(v * factor)));
  });
  return '#' + ch.map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
}

function r(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export const CAR_LEN = 76;
export const CAR_WID = 34;

export function drawCar32(ctx: CanvasRenderingContext2D, x: number, y: number, look: CarLook): void {
  const body = look.color;
  const dark = shade(body, 0.62);
  const light = shade(body, 1.25);
  const glass = '#1a2b46';
  const wheel = '#14161f';

  // เงา
  ctx.fillStyle = 'rgba(0,0,0,.32)';
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y + 4), CAR_LEN / 2 - 4, CAR_WID / 2 - 2, 0, 0, Math.PI * 2);
  ctx.fill();

  if (look.axis === 'h') {
    const hw = CAR_LEN / 2;
    const hh = CAR_WID / 2;
    // ล้อ (อยู่ในกรอบตัวถัง)
    r(ctx, x - hw + 10, y - hh - 2, 14, 5, wheel);
    r(ctx, x + hw - 24, y - hh - 2, 14, 5, wheel);
    r(ctx, x - hw + 10, y + hh - 3, 14, 5, wheel);
    r(ctx, x + hw - 24, y + hh - 3, 14, 5, wheel);
    // ตัวถัง
    r(ctx, x - hw, y - hh, CAR_LEN, CAR_WID, dark);
    r(ctx, x - hw + 2, y - hh + 2, CAR_LEN - 4, CAR_WID - 4, body);
    r(ctx, x - hw + 2, y - hh + 2, CAR_LEN - 4, 3, light);
    // ฝากระโปรง/ท้าย (เงา)
    r(ctx, x + (look.dir > 0 ? 24 : -hw + 2), y - hh + 4, 10, CAR_WID - 8, shade(body, 0.88));
    // ห้องโดยสาร
    r(ctx, x - 18, y - hh + 4, 36, CAR_WID - 8, dark);
    r(ctx, x - 16, y - hh + 5, 32, CAR_WID - 10, shade(body, 1.06));
    // กระจกหน้า/หลัง
    r(ctx, x + 10, y - hh + 6, 7, CAR_WID - 12, glass);
    r(ctx, x - 17, y - hh + 6, 6, CAR_WID - 12, glass);
    // ไฟหน้า/ท้าย
    const fx = look.dir > 0 ? x + hw - 6 : x - hw + 2;
    const bx = look.dir > 0 ? x - hw + 2 : x + hw - 6;
    r(ctx, fx, y - hh + 6, 4, 6, '#fff2c0');
    r(ctx, fx, y + hh - 12, 4, 6, '#fff2c0');
    r(ctx, bx, y - hh + 6, 4, 6, '#e0403f');
    r(ctx, bx, y + hh - 12, 4, 6, '#e0403f');
  } else {
    const hw = CAR_WID / 2;
    const hh = CAR_LEN / 2;
    r(ctx, x - hw - 2, y - hh + 10, 5, 14, wheel);
    r(ctx, x - hw - 2, y + hh - 24, 5, 14, wheel);
    r(ctx, x + hw - 3, y - hh + 10, 5, 14, wheel);
    r(ctx, x + hw - 3, y + hh - 24, 5, 14, wheel);

    r(ctx, x - hw, y - hh, CAR_WID, CAR_LEN, dark);
    r(ctx, x - hw + 2, y - hh + 2, CAR_WID - 4, CAR_LEN - 4, body);
    r(ctx, x - hw + 2, y - hh + 2, 3, CAR_LEN - 4, light);
    r(ctx, x - hw + 4, y + (look.dir > 0 ? 24 : -hh + 2), CAR_WID - 8, 10, shade(body, 0.88));

    r(ctx, x - hw + 4, y - 18, CAR_WID - 8, 36, dark);
    r(ctx, x - hw + 5, y - 16, CAR_WID - 10, 32, shade(body, 1.06));
    r(ctx, x - hw + 6, y + 10, CAR_WID - 12, 7, glass);
    r(ctx, x - hw + 6, y - 17, CAR_WID - 12, 6, glass);

    const fy = look.dir > 0 ? y + hh - 6 : y - hh + 2;
    const by = look.dir > 0 ? y - hh + 2 : y + hh - 6;
    r(ctx, x - hw + 6, fy, 6, 4, '#fff2c0');
    r(ctx, x + hw - 12, fy, 6, 4, '#fff2c0');
    r(ctx, x - hw + 6, by, 6, 4, '#e0403f');
    r(ctx, x + hw - 12, by, 6, 4, '#e0403f');
  }
}
