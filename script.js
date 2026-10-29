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
    if (themeToggleBtn) {
        themeToggleBtn.setAttribute('aria-pressed', String(theme === 'light'));
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

// Pure conversion logic lives in converter.js
const { formatNumber, convertTemperature, getFormula, getTemperatureStatus } = window.ThermoConvert;

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

    // execCommand returns false (or throws) when copying is blocked
    let copied = false;
    try {
        copied = document.execCommand('copy');
    } catch (e) {
        copied = false;
    }
    document.body.removeChild(tempInput);

    showToast(copied
        ? `Nilai ${label} (${text}) berhasil disalin!`
        : `Gagal menyalin. Salin manual: ${text}`);
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

// Screen reader announcement, debounced so typing "123" isn't read as "1", "12", "123"
let announceTimer = null;
function announce(message) {
    const srStatus = document.getElementById('srStatus');
    if (!srStatus) return;

    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => {
        srStatus.textContent = message;
    }, 600);
}

function showError(message) {
    announce(message);
    document.getElementById('hasil').innerHTML = `
        <div class="result-error">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
    const gaugeTrack = document.getElementById('gaugeTrack');
    const gaugeFill = document.getElementById('gaugeFill');
    const statusBadge = document.getElementById('tempStatusBadge');

    const rawValue = inputElement.value.trim();

    if (rawValue === '' || isNaN(parseFloat(rawValue))) {
        announce('');
        hasilElemen.innerHTML = `
            <div class="result-placeholder">
                Masukkan nilai suhu untuk melihat hasil konversi otomatis.
            </div>
        `;
        if (gaugeBox) gaugeBox.style.display = 'none';
        return;
    }

    const result = convertTemperature(parseFloat(rawValue), inputSatuan);
    if (result.error) {
        showError(result.error);
        return;
    }

    const { celsius, fahrenheit, kelvin } = result;
    const formulaDesc = getFormula(inputSatuan, result);

    // Status badge & gauge based on Celsius equivalent
    const status = getTemperatureStatus(celsius);
    const statusText = status.text;
    const statusClass = status.className;
    const gaugePercent = status.percent;

    if (gaugeBox && statusBadge && gaugeFill) {
        gaugeBox.style.display = 'flex';
        statusBadge.textContent = statusText;
        statusBadge.className = `temp-status-badge ${statusClass}`;
        gaugeFill.style.width = `${gaugePercent}%`;
        gaugeFill.className = `gauge-fill ${statusClass}`;

        if (gaugeTrack) {
            gaugeTrack.setAttribute('aria-valuenow', String(Math.round(gaugePercent)));
            gaugeTrack.setAttribute('aria-valuetext', statusText);
        }
    }

    const cFormatted = formatNumber(celsius);
    const fFormatted = formatNumber(fahrenheit);
    const kFormatted = formatNumber(kelvin);

    announce(`${cFormatted} °C sama dengan ${fFormatted} °F dan ${kFormatted} K. Status suhu: ${statusText}.`);

    hasilElemen.innerHTML = `
        <div class="results-grid">
            <button type="button" class="result-card ${inputSatuan === 'celsius' ? 'is-active' : ''}"
                 data-copy="${cFormatted} °C" data-label="Celsius"
                 aria-label="Salin nilai Celsius: ${cFormatted} °C"
                 title="Klik untuk menyalin">
                <span class="unit-badge">Celsius</span>
                <span class="value-display">${cFormatted}<span class="unit-symbol">°C</span></span>
                <span class="copy-hint" aria-hidden="true">Salin 📋</span>
            </button>

            <button type="button" class="result-card ${inputSatuan === 'fahrenheit' ? 'is-active' : ''}"
                 data-copy="${fFormatted} °F" data-label="Fahrenheit"
                 aria-label="Salin nilai Fahrenheit: ${fFormatted} °F"
                 title="Klik untuk menyalin">
                <span class="unit-badge">Fahrenheit</span>
                <span class="value-display">${fFormatted}<span class="unit-symbol">°F</span></span>
                <span class="copy-hint" aria-hidden="true">Salin 📋</span>
            </button>

            <button type="button" class="result-card ${inputSatuan === 'kelvin' ? 'is-active' : ''}"
                 data-copy="${kFormatted} K" data-label="Kelvin"
                 aria-label="Salin nilai Kelvin: ${kFormatted} K"
                 title="Klik untuk menyalin">
                <span class="unit-badge">Kelvin</span>
                <span class="value-display">${kFormatted}<span class="unit-symbol">K</span></span>
                <span class="copy-hint" aria-hidden="true">Salin 📋</span>
            </button>
        </div>

        <div class="formula-card">
            <div class="formula-header">
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
}

if (inputSatuanElem) {
    inputSatuanElem.addEventListener('change', () => {
        konversiSuhu();
    });
}

const btnKonversi = document.getElementById('btnKonversi');
if (btnKonversi) {
    btnKonversi.addEventListener('click', konversiSuhu);
}

// Preset chips carry their value/unit in data attributes
document.querySelectorAll('.preset-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
        setPreset(chip.dataset.value, chip.dataset.unit);
    });
});

// Result cards are re-rendered on every conversion, so delegate from #hasil
const hasilContainer = document.getElementById('hasil');
if (hasilContainer) {
    hasilContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.result-card');
        if (card) copyValue(card.dataset.copy, card.dataset.label);
    });
}

// Initialize on page load (script runs at the end of <body>, so the DOM is ready)
// Default preview with 25 °C
if (inputSuhuElem && inputSuhuElem.value === '') {
    inputSuhuElem.value = '25';
}
checkClearBtn();
konversiSuhu();