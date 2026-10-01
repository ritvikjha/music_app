/**
 * src/jarvis/tools/unitConvertTool.ts
 *
 * Unit conversions: distance, temperature, weight.
 */

export function convertUnits(val: number, from: string, to: string): string {
  const f = from.toLowerCase().trim();
  const t = to.toLowerCase().trim();

  // Distance
  if ((f === 'mile' || f === 'miles') && (t === 'km' || t === 'kilometers' || t === 'kilometres')) {
    const res = (val * 1.60934).toFixed(2);
    return `${val} miles is approximately ${res} kilometers`;
  }
  if ((f === 'km' || f === 'kilometers' || f === 'kilometres') && (t === 'mile' || t === 'miles')) {
    const res = (val / 1.60934).toFixed(2);
    return `${val} kilometers is approximately ${res} miles`;
  }
  if ((f === 'meter' || f === 'meters' || f === 'm') && (t === 'feet' || t === 'foot' || t === 'ft')) {
    const res = (val * 3.28084).toFixed(2);
    return `${val} meters is ${res} feet`;
  }
  if ((f === 'feet' || f === 'foot' || f === 'ft') && (t === 'meter' || t === 'meters' || t === 'm')) {
    const res = (val / 3.28084).toFixed(2);
    return `${val} feet is ${res} meters`;
  }

  // Temperature
  if ((f === 'celsius' || f === 'c') && (t === 'fahrenheit' || t === 'f')) {
    const res = ((val * 9) / 5 + 32).toFixed(1);
    return `${val}° Celsius is ${res}° Fahrenheit`;
  }
  if ((f === 'fahrenheit' || f === 'f') && (t === 'celsius' || t === 'c')) {
    const res = (((val - 32) * 5) / 9).toFixed(1);
    return `${val}° Fahrenheit is ${res}° Celsius`;
  }

  // Weight
  if ((f === 'kg' || f === 'kilograms') && (t === 'lbs' || t === 'pounds')) {
    const res = (val * 2.20462).toFixed(2);
    return `${val} kilograms is ${res} pounds`;
  }
  if ((f === 'lbs' || f === 'pounds') && (t === 'kg' || t === 'kilograms')) {
    const res = (val / 2.20462).toFixed(2);
    return `${val} pounds is ${res} kilograms`;
  }

  return `I cannot convert between ${from} and ${to} yet.`;
}
