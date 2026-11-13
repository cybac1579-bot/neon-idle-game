/* Cosmetic-only character registry. Intentionally independent of game.js and the gameplay save key. */
(function () {
  'use strict';
  const STORAGE_KEY = 'neon_cosmetic_v1';
  const DEFAULT = { character: 'seha', outfit: 'default' };
  // Add new character/outfit entries here; artwork must exist under site/ before publishing.
  const CATALOG = Object.freeze({
    seha: Object.freeze({
      label: '세하',
      outfits: Object.freeze({
        default: Object.freeze({ label: '기본 의상', image: 'seha_portrait.webp' })
      })
    })
  });
  function normalize(value) {
    const character = value && typeof value.character === 'string' ? value.character : DEFAULT.character;
    const entry = Object.prototype.hasOwnProperty.call(CATALOG, character) ? CATALOG[character] : CATALOG[DEFAULT.character];
    const outfit = value && typeof value.outfit === 'string' && Object.prototype.hasOwnProperty.call(entry.outfits, value.outfit) ? value.outfit : 'default';
    return { character: Object.prototype.hasOwnProperty.call(CATALOG, character) ? character : DEFAULT.character, outfit };
  }
  function read() {
    try { return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
    catch (_) { return { ...DEFAULT }; }
  }
  function write(value) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  }
  function mount() {
    const image = document.getElementById('heroImage');
    const characterInput = document.getElementById('cosmeticCharacter');
    const outfitInput = document.getElementById('cosmeticOutfit');
    const status = document.getElementById('cosmeticStatus');
    if (!image || !characterInput || !outfitInput || !status) return;
    let selected = read();
    function fill(select, options, chosen) {
      select.replaceChildren();
      for (const [id, label] of options) {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = label;
        select.append(option);
      }
      select.value = chosen;
    }
    function render() {
      selected = normalize(selected);
      const entry = CATALOG[selected.character];
      fill(characterInput, Object.entries(CATALOG).map(([id, v]) => [id, v.label]), selected.character);
      fill(outfitInput, Object.entries(entry.outfits).map(([id, v]) => [id, v.label]), selected.outfit);
      const asset = entry.outfits[selected.outfit];
      image.src = asset.image;
      image.alt = entry.label + ' · ' + asset.label;
      status.textContent = entry.label + ' · ' + asset.label + ' (외형만 변경, 능력치 영향 없음)';
    }
    function update(character, outfit) {
      selected = normalize({ character, outfit });
      render();
      if (!write(selected)) status.textContent += ' · 저장 제한으로 다음 실행에 유지되지 않을 수 있어';
    }
    characterInput.addEventListener('change', () => update(characterInput.value, 'default'));
    outfitInput.addEventListener('change', () => update(characterInput.value, outfitInput.value));
    image.addEventListener('error', () => {
      if (image.getAttribute('src') !== CATALOG.seha.outfits.default.image) {
        selected = { ...DEFAULT };
        render();
        status.textContent += ' · 이미지 누락으로 기본 외형 복원';
      }
    });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
