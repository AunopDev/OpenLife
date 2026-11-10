/* bills — ค่าคงที่ (ตัวเลขเกม: docs/GDD.md "บิลที่อยู่") */

/** ผลเสียเมื่อเลือกผ่อนบิลเข้าบัตรเครดิต หรือค้างจ่ายจนทบเข้าบัตร */
export const CARD_PENALTY = { credit: 3, heart: 2 };

/** id ของปุ่มในหน้าบิล — view กับ controller ใช้ชุดเดียวกัน */
export const BILL_IDS = {
  payCash: 'billPayCash',
  payCard: 'billPayCard',
  toggleAuto: 'billAuto',
  close: 'billClose'
} as const;
