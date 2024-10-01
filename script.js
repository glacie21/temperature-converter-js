function konversiSuhu() {
    const inputSuhu = parseFloat(document.getElementById('inputSuhu').value);
    const inputSatuan = document.getElementById('inputSatuan').value;
    const hasilElemen = document.getElementById('hasil');

    if (isNaN(inputSuhu)) {
        hasilElemen.innerHTML = 'Masukkan suhu yang valid';
        return;
    }

    let celsius, fahrenheit, kelvin;

    switch (inputSatuan) {
        case 'celsius':
            celsius = inputSuhu;
            fahrenheit = (celsius * 9/5) + 32;
            kelvin = celsius + 273.15;
            break;
        case 'fahrenheit':
            fahrenheit = inputSuhu;
            celsius = (fahrenheit - 32) * 5/9;
            kelvin = (fahrenheit - 32) * 5/9 + 273.15;
            break;
        case 'kelvin':
            kelvin = inputSuhu;
            celsius = kelvin - 273.15;
            fahrenheit = (kelvin - 273.15) * 9/5 + 32;
            break;
    }

    hasilElemen.innerHTML = `
        ${inputSuhu} ${inputSatuan} setara dengan:<br>
        ${celsius.toFixed(2)} °C<br>
        ${fahrenheit.toFixed(2)} °F<br>
        ${kelvin.toFixed(2)} K
    `;
}