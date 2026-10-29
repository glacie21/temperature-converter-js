/**
 * ThermoConvert - Pure conversion logic (no DOM access).
 * Loaded as a plain <script> in the browser (exposes window.ThermoConvert)
 * and via require() in the Node tests.
 */
(function (root) {
    const KELVIN_OFFSET = 273.15;

    // Format numbers in id-ID locale, max 2 decimals, no trailing zeros
    function formatNumber(num) {
        // `|| 0` turns -0 (e.g. from -0.001 rounded) into 0
        const rounded = parseFloat(num.toFixed(2)) || 0;
        return rounded.toLocaleString('id-ID', { maximumFractionDigits: 2 });
    }

    const KELVIN_OFFSET_TEXT = formatNumber(KELVIN_OFFSET);

    /**
     * Convert a value from `unit` to all three scales.
     * Returns { celsius, fahrenheit, kelvin } or { error } with a user-facing message.
     */
    function convertTemperature(value, unit) {
        // Kelvin cannot be below absolute zero (0 K)
        if (unit === 'kelvin' && value < 0) {
            return { error: 'Suhu Kelvin tidak boleh di bawah nol mutlak (0 K).' };
        }

        let celsius, fahrenheit, kelvin;

        switch (unit) {
            case 'celsius':
                celsius = value;
                fahrenheit = (celsius * 9/5) + 32;
                kelvin = celsius + KELVIN_OFFSET;
                break;
            case 'fahrenheit':
                fahrenheit = value;
                celsius = (fahrenheit - 32) * 5/9;
                kelvin = celsius + KELVIN_OFFSET;
                break;
            case 'kelvin':
                kelvin = value;
                celsius = kelvin - KELVIN_OFFSET;
                fahrenheit = (celsius * 9/5) + 32;
                break;
            default:
                return { error: 'Satuan suhu tidak dikenal.' };
        }

        // Reject values that overflow to Infinity (e.g. 1e308 °C → °F)
        if (![celsius, fahrenheit, kelvin].every(Number.isFinite)) {
            return { error: 'Nilai terlalu besar untuk dihitung. Coba angka yang lebih kecil.' };
        }

        // Check absolute zero for Celsius and Fahrenheit
        if (celsius < -KELVIN_OFFSET) {
            return { error: `Suhu di bawah nol mutlak (-${KELVIN_OFFSET_TEXT} °C) tidak dimungkinkan secara fisika.` };
        }

        return { celsius, fahrenheit, kelvin };
    }

    // Human-readable formula for the unit the user typed in
    function getFormula(unit, result) {
        const c = formatNumber(result.celsius);
        switch (unit) {
            case 'celsius':
                return `°F = (${c} × 9/5) + 32 | K = ${c} + ${KELVIN_OFFSET_TEXT}`;
            case 'fahrenheit':
                return `°C = (${formatNumber(result.fahrenheit)} - 32) × 5/9 | K = ${c} + ${KELVIN_OFFSET_TEXT}`;
            case 'kelvin':
                return `°C = ${formatNumber(result.kelvin)} - ${KELVIN_OFFSET_TEXT} | °F = (${c} × 9/5) + 32`;
            default:
                return '';
        }
    }

    // Status badge text, CSS class, and gauge fill (0–100) based on Celsius
    function getTemperatureStatus(celsius) {
        if (celsius <= 0) {
            return { text: 'Beku / Dingin Ekstrem', className: 'cold', percent: Math.max(5, 20 + celsius * 0.5) };
        }
        if (celsius <= 18) {
            return { text: 'Sejuk', className: 'cool', percent: 20 + (celsius / 18) * 20 };
        }
        if (celsius <= 32) {
            return { text: 'Nyaman / Normal', className: 'normal', percent: 40 + ((celsius - 18) / 14) * 20 };
        }
        if (celsius <= 50) {
            return { text: 'Hangat / Panas', className: 'warm', percent: 60 + ((celsius - 32) / 18) * 20 };
        }
        return { text: 'Sangat Panas', className: 'hot', percent: Math.min(100, 80 + ((celsius - 50) / 50) * 20) };
    }

    const api = { KELVIN_OFFSET, formatNumber, convertTemperature, getFormula, getTemperatureStatus };

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        root.ThermoConvert = api;
    }
})(this);
