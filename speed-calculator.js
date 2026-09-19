(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const speed = $('speed'), size = $('size');
  const speedUnit = $('speed-unit'), sizeUnit = $('size-unit');
  const format = (value) => value.toLocaleString('ja-JP', { maximumSignificantDigits: 8 });
  function duration(seconds) {
    if (seconds < 1) return '1秒未満';
    const total = Math.ceil(seconds);
    const days = Math.floor(total / 86400);
    const hours = Math.floor(total % 86400 / 3600);
    const minutes = Math.floor(total % 3600 / 60);
    const rest = total % 60;
    return [[days, '日'], [hours, '時間'], [minutes, '分'], [rest, '秒']]
      .filter(([n]) => n > 0).map(([n, unit]) => format(n) + unit).join(' ');
  }
  function update() {
    const s = speed.valueAsNumber, z = size.valueAsNumber;
    if (![s, z].every(n => Number.isFinite(n) && n >= 0.000001 && n <= 1e9)) {
      $('time').textContent = '—'; $('converted').textContent = '—';
      $('error').textContent = '速度と容量に0.000001〜1,000,000,000の数値を入力してください。';
      return;
    }
    const mbps = s * ({ Mbps: 1, Gbps: 1000, 'MB/s': 8 }[speedUnit.value]);
    const bytes = z * ({ GB: 1e9, MB: 1e6, GiB: 2 ** 30, MiB: 2 ** 20 }[sizeUnit.value]);
    $('time').textContent = duration(bytes * 8 / (mbps * 1e6));
    $('converted').textContent = format(mbps) + ' Mbps = ' + format(mbps / 8) + ' MB/s';
    $('error').textContent = '';
  }
  [speed, size, speedUnit, sizeUnit].forEach(el => el.addEventListener('input', update));
  document.querySelectorAll('[data-speed]').forEach(button => button.addEventListener('click', () => {
    speed.value = button.dataset.speed; speedUnit.value = 'Mbps'; update();
  }));
  document.querySelectorAll('[data-size]').forEach(button => button.addEventListener('click', () => {
    size.value = button.dataset.size; sizeUnit.value = 'GB'; update();
  }));
  update();
})();
