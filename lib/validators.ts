import { onlyDigits } from './mockData';

export function isValidCPF(raw: string): boolean {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  if (rev !== parseInt(cpf[9], 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev >= 10) rev = 0;
  return rev === parseInt(cpf[10], 10);
}

export function isValidCNPJ(raw: string): boolean {
  const cnpj = onlyDigits(raw);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (base: string) => {
    let sum = 0;
    let pos = base.length - 7;
    for (let i = base.length; i >= 1; i--) {
      sum += parseInt(base.charAt(base.length - i), 10) * pos--;
      if (pos < 2) pos = 9;
    }
    const result = sum % 11;
    return result < 2 ? 0 : 11 - result;
  };
  const d1 = calc(cnpj.substring(0, 12));
  if (d1 !== parseInt(cnpj.charAt(12), 10)) return false;
  const d2 = calc(cnpj.substring(0, 13));
  return d2 === parseInt(cnpj.charAt(13), 10);
}

export function isValidCpfCnpj(raw: string): boolean {
  const d = onlyDigits(raw);
  return d.length === 11 ? isValidCPF(d) : d.length === 14 ? isValidCNPJ(d) : false;
}

export function maskCPF(raw: string): string {
  const d = onlyDigits(raw).slice(0, 11);
  const p1 = d.slice(0, 3), p2 = d.slice(3, 6), p3 = d.slice(6, 9), p4 = d.slice(9, 11);
  let out = p1;
  if (p2) out += '.' + p2;
  if (p3) out += '.' + p3;
  if (p4) out += '-' + p4;
  return out;
}

export function maskCNPJ(raw: string): string {
  const d = onlyDigits(raw).slice(0, 14);
  const p1 = d.slice(0, 2), p2 = d.slice(2, 5), p3 = d.slice(5, 8), p4 = d.slice(8, 12), p5 = d.slice(12, 14);
  let out = p1;
  if (p2) out += '.' + p2;
  if (p3) out += '.' + p3;
  if (p4) out += '/' + p4;
  if (p5) out += '-' + p5;
  return out;
}

export function maskCpfCnpj(raw: string): string {
  const d = onlyDigits(raw);
  return d.length > 11 ? maskCNPJ(d) : maskCPF(d);
}

export function maskCEP(raw: string): string {
  const d = onlyDigits(raw).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
