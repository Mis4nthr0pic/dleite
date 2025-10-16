function onlyDigits(str) {
  return (str || '').replace(/\D+/g, '');
}

function validPhone(str) {
  const digits = onlyDigits(str);
  // Accept 10 to 15 digits (international or local formats)
  return digits.length >= 10 && digits.length <= 15;
}

// Brazilian CNPJ validation
function validCNPJ(cnpjRaw) {
  let cnpj = onlyDigits(cnpjRaw);
  if (!cnpj || cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false; // all same digits

  const calc = (cnpj, pos) => {
    let size = pos - 7;
    let sum = 0;
    let numbers = cnpj.substring(0, pos);
    let weights = [5,4,3,2,9,8,7,6,5,4,3,2];
    if (pos === 13) weights = [6].concat(weights);
    for (let i = 0; i < numbers.length; i++) sum += parseInt(numbers[i], 10) * weights[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const d1 = calc(cnpj, 12);
  const d2 = calc(cnpj, 13);
  return cnpj[12] == d1 && cnpj[13] == d2;
}

module.exports = { onlyDigits, validPhone, validCNPJ };

