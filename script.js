/**
 * ThermoConvert - Modern Temperature Converter Logic
 * Supports real-time conversion, status gauge, copy-to-clipboard,
 * quick presets, and theme management.
 */

// Theme Management
const THEME_KEY = 'thermoconvert-theme';
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');
const systemLightQuery = window.matchMedia('(prefers-color-scheme: light)');

// localStorage can throw (e.g. private mode / blocked storage)
function getSavedTheme() {
    try {
        return localStorage.getItem(THEME_KEY);
    } catch (e) {
        return null;
    }
}

function saveTheme(theme) {
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
        // Ignore: theme just won't persist
    }
}

function getSystemTheme() {
    return systemLightQuery.matches ? 'light' : 'dark';
}

function initTheme() {
    setTheme(getSavedTheme() || getSystemTheme());

    // Follow OS theme changes until the user picks a theme manually
    systemLightQuery.addEventListener('change', () => {
        if (!getSavedTheme()) setTheme(getSystemTheme());
    });
}

function setTheme(theme) {
    if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        if (themeIcon) {
            themeIcon.innerHTML = `
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            `;
        }
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (themeIcon) {
            themeIcon.innerHTML = `
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            `;
        }
    }
}

initTheme();

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(nextTheme);
        saveTheme(nextTheme);
    });
}

// Format numbers in id-ID locale, max 2 decimals, no trailing zeros
function formatNumber(num) {
    // `|| 0` turns -0 (e.g. from -0.001 rounded) into 0
    const rounded = parseFloat(num.toFixed(2)) || 0;
    return rounded.toLocaleString('id-ID', { maximumFractionDigits: 2 });
}

const KELVIN_OFFSET = 273.15;
const KELVIN_OFFSET_TEXT = formatNumber(KELVIN_OFFSET);

// Copy to clipboard helper
function copyValue(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(`Nilai ${label} (${text}) berhasil disalin!`);
        }).catch(() => {
            fallbackCopy(text, label);
        });
    } else {
        fallbackCopy(text, label);
    }
}

function fallbackCopy(text, label) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showToast(`Nilai ${label} (${text}) berhasil disalin!`);
}

let toastTimer = null;
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toastText');
    if (!toast || !toastText) return;

    toastText.textContent = message;
    toast.classList.add('show');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2400);
}

// Preset Handler
function setPreset(value, unit) {
    const inputSuhu = document.getElementById('inputSuhu');
    const inputSatuan = document.getElementById('inputSatuan');
    
    if (inputSuhu) inputSuhu.value = value;
    if (inputSatuan) inputSatuan.value = unit;
    
    checkClearBtn();
    konversiSuhu();
}

function showError(message) {
    document.getElementById('hasil').innerHTML = `
        <div class="result-error">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            ${message}
        </div>
    `;
    const gaugeBox = document.getElementById('tempGaugeBox');
    if (gaugeBox) gaugeBox.style.display = 'none';
}

// Main Conversion Function
function konversiSuhu() {
    const inputElement = document.getElementById('inputSuhu');
    const inputSatuan = document.getElementById('inputSatuan').value;
    const hasilElemen = document.getElementById('hasil');
    const gaugeBox = document.getElementById('tempGaugeBox');
    const gaugeFill = document.getElementById('gaugeFill');
    const statusBadge = document.getElementById('tempStatusBadge');

    const rawValue = inputElement.value.trim();

    if (rawValue === '' || isNaN(parseFloat(rawValue))) {
        hasilElemen.innerHTML = `
            <div class="result-placeholder">
                Masukkan nilai suhu untuk melihat hasil konversi otomatis.
            </div>
        `;
        if (gaugeBox) gaugeBox.style.display = 'none';
        return;
    }

    const inputSuhu = parseFloat(rawValue);

    // Kelvin cannot be below absolute zero (0 K)
    if (inputSatuan === 'kelvin' && inputSuhu < 0) {
        showError('Suhu Kelvin tidak boleh di bawah nol mutlak (0 K).');
        return;
    }

    let celsius, fahrenheit, kelvin;
    let formulaDesc = '';

    switch (inputSatuan) {
        case 'celsius':
            celsius = inputSuhu;
            fahrenheit = (celsius * 9/5) + 32;
            kelvin = celsius + KELVIN_OFFSET;
            formulaDesc = `°F = (${formatNumber(celsius)} × 9/5) + 32 | K = ${formatNumber(celsius)} + ${KELVIN_OFFSET_TEXT}`;
            break;
        case 'fahrenheit':
            fahrenheit = inputSuhu;
            celsius = (fahrenheit - 32) * 5/9;
            kelvin = celsius + KELVIN_OFFSET;
            formulaDesc = `°C = (${formatNumber(fahrenheit)} - 32) × 5/9 | K = °C + ${KELVIN_OFFSET_TEXT}`;
            break;
        case 'kelvin':
            kelvin = inputSuhu;
            celsius = kelvin - KELVIN_OFFSET;
            fahrenheit = (celsius * 9/5) + 32;
            formulaDesc = `°C = ${formatNumber(kelvin)} - ${KELVIN_OFFSET_TEXT} | °F = (°C × 9/5) + 32`;
            break;
    }

    // Reject values that overflow to Infinity (e.g. 1e308 °C → °F)
    if (![celsius, fahrenheit, kelvin].every(Number.isFinite)) {
        showError('Nilai terlalu besar untuk dihitung. Coba angka yang lebih kecil.');
        return;
    }

    // Check absolute zero for Celsius and Fahrenheit
    if (celsius < -KELVIN_OFFSET) {
        showError(`Suhu di bawah nol mutlak (-${KELVIN_OFFSET_TEXT} °C) tidak dimungkinkan secara fisika.`);
        return;
    }

    // Determine status badge & gauge based on Celsius equivalent
    let statusText = 'Normal';
    let statusClass = 'normal';
    let gaugePercent = 50;

    if (celsius <= 0) {
        statusText = 'Beku / Dingin Ekstrem';
        statusClass = 'cold';
        gaugePercent = Math.max(5, 20 + celsius * 0.5);
    } else if (celsius <= 18) {
        statusText = 'Sejuk';
        statusClass = 'cool';
        gaugePercent = 20 + (celsius / 18) * 20;
    } else if (celsius <= 32) {
        statusText = 'Nyaman / Normal';
        statusClass = 'normal';
        gaugePercent = 40 + ((celsius - 18) / 14) * 20;
    } else if (celsius <= 50) {
        statusText = 'Hangat / Panas';
        statusClass = 'warm';
        gaugePercent = 60 + ((celsius - 32) / 18) * 20;
    } else {
        statusText = 'Sangat Panas';
        statusClass = 'hot';
        gaugePercent = Math.min(100, 80 + ((celsius - 50) / 50) * 20);
    }

    if (gaugeBox && statusBadge && gaugeFill) {
        gaugeBox.style.display = 'flex';
        statusBadge.textContent = statusText;
        statusBadge.className = `temp-status-badge ${statusClass}`;
        gaugeFill.style.width = `${gaugePercent}%`;
        
        const colors = {
            cold: '#38bdf8',
            cool: '#2dd4bf',
            normal: '#4ade80',
            warm: '#fbbf24',
            hot: '#f87171'
        };
        gaugeFill.style.backgroundColor = colors[statusClass] || '#38bdf8';
    }

    const cFormatted = formatNumber(celsius);
    const fFormatted = formatNumber(fahrenheit);
    const kFormatted = formatNumber(kelvin);

    hasilElemen.innerHTML = `
        <div class="results-grid">
            <div class="result-card ${inputSatuan === 'celsius' ? 'is-active' : ''}" 
                 onclick="copyValue('${cFormatted} °C', 'Celsius')"
                 title="Klik untuk menyalin">
                <span class="unit-badge">Celsius</span>
                <span class="value-display">${cFormatted}<span class="unit-symbol">°C</span></span>
                <span class="copy-hint">Salin 📋</span>
            </div>

            <div class="result-card ${inputSatuan === 'fahrenheit' ? 'is-active' : ''}" 
                 onclick="copyValue('${fFormatted} °F', 'Fahrenheit')"
                 title="Klik untuk menyalin">
                <span class="unit-badge">Fahrenheit</span>
                <span class="value-display">${fFormatted}<span class="unit-symbol">°F</span></span>
                <span class="copy-hint">Salin 📋</span>
            </div>

            <div class="result-card ${inputSatuan === 'kelvin' ? 'is-active' : ''}" 
                 onclick="copyValue('${kFormatted} K', 'Kelvin')"
                 title="Klik untuk menyalin">
                <span class="unit-badge">Kelvin</span>
                <span class="value-display">${kFormatted}<span class="unit-symbol">K</span></span>
                <span class="copy-hint">Salin 📋</span>
            </div>
        </div>

        <div class="formula-card">
            <div class="formula-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                Rumus Perhitungan
            </div>
            <div class="formula-text">${formulaDesc}</div>
        </div>
    `;
}

// Clear button logic
const inputSuhuElem = document.getElementById('inputSuhu');
const clearBtn = document.getElementById('clearBtn');
const inputSatuanElem = document.getElementById('inputSatuan');

function checkClearBtn() {
    if (!clearBtn || !inputSuhuElem) return;
    if (inputSuhuElem.value.trim() !== '') {
        clearBtn.classList.add('visible');
    } else {
        clearBtn.classList.remove('visible');
    }
}

if (clearBtn && inputSuhuElem) {
    clearBtn.addEventListener('click', () => {
        inputSuhuElem.value = '';
        checkClearBtn();
        konversiSuhu();
        inputSuhuElem.focus();
    });
}

// Realtime listeners
if (inputSuhuElem) {
    inputSuhuElem.addEventListener('input', () => {
        checkClearBtn();
        konversiSuhu();
    });

    inputSuhuElem.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            konversiSuhu();
        }
    });
}

if (inputSatuanElem) {
    inputSatuanElem.addEventListener('change', () => {
        konversiSuhu();
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkClearBtn();
    // Default preview with 25 °C
    if (inputSuhuElem && inputSuhuElem.value === '') {
        inputSuhuElem.value = '25';
        checkClearBtn();
        konversiSuhu();
    }
});