/* OpenLife — reusable appearance editor UI
   ใช้ทั้งตอนสร้างตัวละคร / กระจกที่บ้าน / ร้านตัดผม / ร้านเสื้อผ้า */
import {
  Appearance,
  Option,
  ToneOption,
  SKIN_TONES,
  HAIR_COLORS,
  EYE_COLORS,
  CLOTHES_COLORS,
  FACE_SHAPES,
  HAIR_STYLES,
  EYE_SHAPES,
  BROW_SHAPES,
  NOSE_SHAPES,
  MOUTH_SHAPES,
  FACIAL_HAIR,
  GLASSES,
  HATS,
  ACCESSORIES,
  OUTFITS,
  DEFAULT_APPEARANCE,
  normaliseAppearance,
  randomAppearance,
  paintPortrait
} from './appearance';

export type EditorMode = 'all' | 'hair' | 'style';

export interface AppearanceEditorOptions {
  app: Appearance;
  mode: EditorMode;
  title: string;
  subtitle: string;
  price: number;
  confirmLabel: string;
  backLabel: string;
  previewAge?: number;
  onBack: () => void;
  onConfirm: (app: Appearance, price: number) => void;
  canPay: (price: number) => boolean;
  onNeedMoney: () => void;
  onSound?: () => void;
}

const TABS = [
  { id: 'face', label: 'หน้า', modes: ['all'] },
  { id: 'hair', label: 'ผม', modes: ['all', 'hair'] },
  { id: 'skin', label: 'ผิว', modes: ['all'] },
  { id: 'style', label: 'แต่งตัว', modes: ['all', 'style'] }
];

function optRow(app: Appearance, label: string, field: keyof Appearance, list: Option[]): string {
  const val = (app as any)[field];
  return '<div class="ap-row"><div class="ap-label">' + label + '</div><div class="ap-opts">' +
    list.map(function (o) {
      return '<button type="button" class="ap-opt' + (val === o.id ? ' on' : '') + '"' +
        ' data-ap-set="' + field + '" data-ap-val="' + o.id + '">' + o.label + '</button>';
    }).join('') +
    '</div></div>';
}

function toneRow(app: Appearance, label: string, field: keyof Appearance, list: ToneOption[]): string {
  const val = (app as any)[field];
  return '<div class="ap-row"><div class="ap-label">' + label + '</div><div class="ap-swatches">' +
    list.map(function (o) {
      return '<button type="button" class="ap-swatch' + (val === o.id ? ' on' : '') + '"' +
        ' style="background:' + o.base + '" title="' + o.label + '" aria-label="' + o.label + '"' +
        ' data-ap-set="' + field + '" data-ap-val="' + o.id + '"></button>';
    }).join('') +
    '</div></div>';
}

function toggleRow(app: Appearance, label: string, field: 'freckles' | 'mole'): string {
  const on = !!(app as any)[field];
  return '<div class="ap-row"><div class="ap-label">' + label + '</div><div class="ap-opts">' +
    '<button type="button" class="ap-opt' + (on ? ' on' : '') + '" data-ap-toggle="' + field + '">' +
    (on ? 'เปิด' : 'ปิด') + '</button></div></div>';
}

function bodyFor(app: Appearance, tab: string): string {
  if (tab === 'hair') {
    return optRow(app, 'ทรงผม', 'hair', HAIR_STYLES) +
      toneRow(app, 'สีผม', 'hairColor', HAIR_COLORS) +
      optRow(app, 'หนวดเครา', 'facialHair', FACIAL_HAIR);
  }
  if (tab === 'skin') {
    return toneRow(app, 'สีผิว', 'skin', SKIN_TONES) +
      toggleRow(app, 'กระ', 'freckles') +
      toggleRow(app, 'ไฝ', 'mole');
  }
  if (tab === 'style') {
    return optRow(app, 'เสื้อ', 'outfit', OUTFITS) +
      toneRow(app, 'สีเสื้อ', 'clothes', CLOTHES_COLORS) +
      optRow(app, 'แว่น', 'glasses', GLASSES) +
      optRow(app, 'หมวก', 'hat', HATS) +
      optRow(app, 'เครื่องประดับ', 'accessory', ACCESSORIES);
  }
  return optRow(app, 'รูปหน้า', 'face', FACE_SHAPES) +
    optRow(app, 'ตา', 'eyes', EYE_SHAPES) +
    toneRow(app, 'สีตา', 'eyeColor', EYE_COLORS) +
    optRow(app, 'คิ้ว', 'brows', BROW_SHAPES) +
    optRow(app, 'จมูก', 'nose', NOSE_SHAPES) +
    optRow(app, 'ปาก', 'mouth', MOUTH_SHAPES);
}

function randomForMode(mode: EditorMode, current: Appearance): Appearance {
  if (mode === 'all') return randomAppearance();
  const next = normaliseAppearance(current);
  const rnd = randomAppearance();
  if (mode === 'hair') {
    next.hair = rnd.hair;
    next.hairColor = rnd.hairColor;
    next.facialHair = rnd.facialHair;
  } else if (mode === 'style') {
    next.outfit = rnd.outfit;
    next.clothes = rnd.clothes;
    next.glasses = rnd.glasses;
    next.hat = rnd.hat;
    next.accessory = rnd.accessory;
  }
  return next;
}

export function appearanceEditorHtml(opts: AppearanceEditorOptions): string {
  const tabs = TABS.filter(function (t) { return t.modes.indexOf(opts.mode) >= 0; });
  const firstTab = tabs[0] ? tabs[0].id : 'face';
  const priceLine = opts.price > 0
    ? '<span class="ap-price">฿' + opts.price + '</span>'
    : '<span class="ap-price free">ฟรี</span>';
  return '<div class="ev-head"><span class="ev-chip">แต่งตัว</span><span>' + opts.subtitle + '</span></div>' +
    '<div class="ev-title">' + opts.title + '</div>' +
    '<div class="ap-editor">' +
    '<div class="ap-preview">' +
    '<canvas id="apPortrait" width="32" height="32" aria-label="ตัวอย่างตัวละคร"></canvas>' +
    '<div class="ap-preview-actions">' +
    '<button type="button" class="btn-ghost" data-ap-act="random">🎲 สุ่ม</button>' +
    '<button type="button" class="btn-ghost" data-ap-act="reset">ล้าง</button>' +
    '</div>' +
    '<div class="ap-hint">32×32 pixel · ' + priceLine + '</div>' +
    '</div>' +
    '<div class="ap-panel">' +
    '<div class="ap-tabs" role="tablist">' +
    tabs.map(function (x, i) {
      return '<button type="button" class="ap-tab' + (i === 0 ? ' on' : '') + '" data-ap-tab="' + x.id + '">' + x.label + '</button>';
    }).join('') +
    '</div>' +
    '<div class="ap-body" id="apBody">' + bodyFor(opts.app, firstTab) + '</div>' +
    '</div>' +
    '</div>' +
    '<div class="ap-actions">' +
    '<button type="button" class="btn-primary" id="apNext">' + opts.confirmLabel + '</button>' +
    '<button type="button" class="btn-ghost" id="apBack">' + opts.backLabel + '</button>' +
    '</div>';
}

export function wireAppearanceEditor(modal: HTMLElement, opts: AppearanceEditorOptions): void {
  const draft = normaliseAppearance(opts.app);
  const tabs = TABS.filter(function (t) { return t.modes.indexOf(opts.mode) >= 0; });
  let tab = tabs[0] ? tabs[0].id : 'face';
  const canvas = document.getElementById('apPortrait') as HTMLCanvasElement | null;

  const paint = function () {
    if (canvas) paintPortrait(canvas, draft, undefined, opts.previewAge);
  };
  paint();

  const renderBody = function () {
    const body = document.getElementById('apBody');
    if (body) body.innerHTML = bodyFor(draft, tab);
  };

  modal.querySelectorAll('[data-ap-tab]').forEach(function (b) {
    b.addEventListener('click', function () {
      tab = b.getAttribute('data-ap-tab') || tab;
      modal.querySelectorAll('[data-ap-tab]').forEach(function (x) {
        x.classList.toggle('on', x.getAttribute('data-ap-tab') === tab);
      });
      renderBody();
    });
  });

  const bodyEl = document.getElementById('apBody');
  if (bodyEl) {
    bodyEl.addEventListener('click', function (ev) {
      const el = (ev.target as HTMLElement).closest('[data-ap-set],[data-ap-toggle]') as HTMLElement | null;
      if (!el) return;
      const toggle = el.getAttribute('data-ap-toggle');
      if (toggle) {
        (draft as any)[toggle] = !(draft as any)[toggle];
        if (opts.onSound) opts.onSound();
        paint();
        renderBody();
        return;
      }
      const field = el.getAttribute('data-ap-set');
      const val = el.getAttribute('data-ap-val');
      if (field && val) {
        (draft as any)[field] = val;
        if (opts.onSound) opts.onSound();
        paint();
        renderBody();
      }
    });
  }

  modal.querySelectorAll('[data-ap-act]').forEach(function (b) {
    b.addEventListener('click', function () {
      const act = b.getAttribute('data-ap-act');
      const next = act === 'random'
        ? randomForMode(opts.mode, draft)
        : normaliseAppearance(DEFAULT_APPEARANCE);
      Object.keys(draft).forEach(function (k) { (draft as any)[k] = (next as any)[k]; });
      if (opts.onSound) opts.onSound();
      paint();
      renderBody();
    });
  });

  const back = document.getElementById('apBack');
  if (back) back.addEventListener('click', opts.onBack);

  const next = document.getElementById('apNext');
  if (next) {
    next.addEventListener('click', function () {
      if (opts.price > 0 && !opts.canPay(opts.price)) {
        opts.onNeedMoney();
        return;
      }
      opts.onConfirm(normaliseAppearance(draft), opts.price);
    });
  }
}

/** สุ่มเฉพาะบางส่วน (ใช้กับร้านตัดผม/ร้านเสื้อผ้า) */
export function randomHairStyle(app: Appearance): Appearance {
  return randomForMode('hair', app);
}

export function randomOutfit(app: Appearance): Appearance {
  return randomForMode('style', app);
}
