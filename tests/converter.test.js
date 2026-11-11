const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
    formatNumber,
    convertTemperature,
    getFormula,
    getTemperatureStatus,
} = require('../converter.js');

// Floating point results (e.g. 98.6 °F → 37.000000000000014 °C) need a tolerance
function assertClose(actual, expected) {
    assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≈ ${expected}`);
}

test('Celsius ke Fahrenheit dan Kelvin', () => {
    const r = convertTemperature(100, 'celsius');
    assertClose(r.fahrenheit, 212);
    assertClose(r.kelvin, 373.15);
});

test('Fahrenheit ke Celsius dan Kelvin', () => {
    const r = convertTemperature(98.6, 'fahrenheit');
    assertClose(r.celsius, 37);
    assertClose(r.kelvin, 310.15);
});

test('Kelvin ke Celsius dan Fahrenheit', () => {
    const r = convertTemperature(0, 'kelvin');
    assertClose(r.celsius, -273.15);
    assertClose(r.fahrenheit, -459.67);
});

test('-40 sama di Celsius dan Fahrenheit', () => {
    assertClose(convertTemperature(-40, 'celsius').fahrenheit, -40);
    assertClose(convertTemperature(-40, 'fahrenheit').celsius, -40);
});

test('Nilai asli dipertahankan tanpa pembulatan bolak-balik', () => {
    assert.equal(convertTemperature(98.6, 'fahrenheit').fahrenheit, 98.6);
    assert.equal(convertTemperature(300, 'kelvin').kelvin, 300);
});

test('Tolak Kelvin negatif', () => {
    assert.match(convertTemperature(-1, 'kelvin').error, /Kelvin/);
});

test('Tolak suhu di bawah nol mutlak', () => {
    assert.ok(convertTemperature(-273.16, 'celsius').error);
    assert.ok(convertTemperature(-460, 'fahrenheit').error);
    assert.equal(convertTemperature(-273.15, 'celsius').error, undefined);
});

test('Tolak nilai yang meluap menjadi Infinity', () => {
    assert.match(convertTemperature(1e308, 'celsius').error, /terlalu besar/);
});

test('Tolak satuan yang tidak dikenal', () => {
    assert.ok(convertTemperature(10, 'rankine').error);
});

test('formatNumber memakai format id-ID, maks 2 desimal', () => {
    assert.equal(formatNumber(273.15), '273,15');
    assert.equal(formatNumber(1234.5), '1.234,5');
    assert.equal(formatNumber(37.000000000000014), '37');
    assert.equal(formatNumber(-0.001), '0');
});

test('getFormula menampilkan angka asli untuk setiap satuan', () => {
    assert.equal(
        getFormula('celsius', convertTemperature(25, 'celsius')),
        '°F = (25 × 9/5) + 32 | K = 25 + 273,15'
    );
    assert.equal(
        getFormula('fahrenheit', convertTemperature(98.6, 'fahrenheit')),
        '°C = (98,6 - 32) × 5/9 | K = 37 + 273,15'
    );
    assert.equal(
        getFormula('kelvin', convertTemperature(300, 'kelvin')),
        '°C = 300 - 273,15 | °F = (26,85 × 9/5) + 32'
    );
});

test('getTemperatureStatus: batas tiap kategori', () => {
    assert.equal(getTemperatureStatus(0).className, 'cold');
    assert.equal(getTemperatureStatus(0.1).className, 'cool');
    assert.equal(getTemperatureStatus(18).className, 'cool');
    assert.equal(getTemperatureStatus(25).className, 'normal');
    assert.equal(getTemperatureStatus(32).className, 'normal');
    assert.equal(getTemperatureStatus(40).className, 'warm');
    assert.equal(getTemperatureStatus(51).className, 'hot');
});

test('getTemperatureStatus: gauge selalu di rentang 5–100', () => {
    for (const c of [-273.15, -100, 0, 25, 50, 1000, 1e6]) {
        const { percent } = getTemperatureStatus(c);
        assert.ok(percent >= 5 && percent <= 100, `${c} °C → ${percent}%`);
    }
});
