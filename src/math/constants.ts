export interface ConstantEntry {
  symbol: string;
  insertToken: string;
  name: string;
  category: 'Mathematical' | 'Physics' | 'Chemistry';
  value: string;
  numericValue?: number;
  unit?: string;
  description: string;
}

export const EULER_MASCHERONI = 0.5772156649015329;
export const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;

export const CONSTANTS_LIBRARY: ConstantEntry[] = [
  {
    symbol: 'π',
    insertToken: 'pi',
    name: 'Pi (Archimedes Constant)',
    category: 'Mathematical',
    value: '3.14159265358979323846',
    numericValue: Math.PI,
    description: 'Ratio of a circle’s circumference to its diameter.',
  },
  {
    symbol: 'e',
    insertToken: 'e',
    name: "Euler's Number",
    category: 'Mathematical',
    value: '2.71828182845904523536',
    numericValue: Math.E,
    description: 'Base of the natural logarithm; lim(1 + 1/n)^n.',
  },
  {
    symbol: 'φ',
    insertToken: 'phi',
    name: 'Golden Ratio',
    category: 'Mathematical',
    value: '1.61803398874989484820',
    numericValue: GOLDEN_RATIO,
    description: '(1 + √5) / 2, positive solution to x² - x - 1 = 0.',
  },
  {
    symbol: 'γ',
    insertToken: 'gamma_c',
    name: 'Euler–Mascheroni Constant',
    category: 'Mathematical',
    value: '0.57721566490153286061',
    numericValue: EULER_MASCHERONI,
    description: 'Limiting difference between harmonic series and natural logarithm.',
  },
  {
    symbol: 'i',
    insertToken: 'i',
    name: 'Imaginary Unit',
    category: 'Mathematical',
    value: '√(-1)',
    description: 'Fundamental unit of complex numbers satisfying i² = -1.',
  },
  {
    symbol: '∞',
    insertToken: 'Infinity',
    name: 'Infinity',
    category: 'Mathematical',
    value: '∞',
    numericValue: Infinity,
    description: 'Unbounded limit magnitude in calculus and extended real line.',
  },
  {
    symbol: 'c',
    insertToken: '299792458',
    name: 'Speed of Light in Vacuum',
    category: 'Physics',
    value: '2.99792458 × 10⁸',
    numericValue: 299792458,
    unit: 'm/s',
    description: 'Exact SI defined speed of electromagnetic waves in vacuum.',
  },
  {
    symbol: 'h',
    insertToken: '6.62607015e-34',
    name: 'Planck Constant',
    category: 'Physics',
    value: '6.62607015 × 10⁻³⁴',
    numericValue: 6.62607015e-34,
    unit: 'J·s',
    description: 'Quantum of electromagnetic action relating photon energy to frequency.',
  },
  {
    symbol: 'ℏ',
    insertToken: '1.054571817e-34',
    name: 'Reduced Planck Constant',
    category: 'Physics',
    value: '1.054571817 × 10⁻³⁴',
    numericValue: 1.054571817e-34,
    unit: 'J·s',
    description: 'h / (2π), fundamental angular momentum quantum.',
  },
  {
    symbol: 'G',
    insertToken: '6.67430e-11',
    name: 'Newtonian Gravitational Constant',
    category: 'Physics',
    value: '6.67430 × 10⁻¹¹',
    numericValue: 6.6743e-11,
    unit: 'm³/(kg·s²)',
    description: 'Proportionality constant in Newton’s law of universal gravitation.',
  },
  {
    symbol: 'e₀',
    insertToken: '1.602176634e-19',
    name: 'Elementary Charge',
    category: 'Physics',
    value: '1.602176634 × 10⁻¹⁹',
    numericValue: 1.602176634e-19,
    unit: 'C',
    description: 'Exact electric charge carried by a single proton.',
  },
  {
    symbol: 'k_B',
    insertToken: '1.380649e-23',
    name: 'Boltzmann Constant',
    category: 'Physics',
    value: '1.380649 × 10⁻²³',
    numericValue: 1.380649e-23,
    unit: 'J/K',
    description: 'Relates average kinetic energy of particles to thermodynamic temperature.',
  },
  {
    symbol: 'ε₀',
    insertToken: '8.8541878128e-12',
    name: 'Vacuum Permittivity',
    category: 'Physics',
    value: '8.8541878128 × 10⁻¹²',
    numericValue: 8.8541878128e-12,
    unit: 'F/m',
    description: 'Electric constant characterizing free space capacitance.',
  },
  {
    symbol: 'N_A',
    insertToken: '6.02214076e23',
    name: 'Avogadro Constant',
    category: 'Chemistry',
    value: '6.02214076 × 10²³',
    numericValue: 6.02214076e23,
    unit: 'mol⁻¹',
    description: 'Exact number of constituent particles in one mole.',
  },
  {
    symbol: 'R',
    insertToken: '8.314462618',
    name: 'Ideal Gas Constant',
    category: 'Chemistry',
    value: '8.314462618',
    numericValue: 8.314462618,
    unit: 'J/(mol·K)',
    description: 'Molar equivalent to the Boltzmann constant (N_A · k_B).',
  },
  {
    symbol: 'm_e',
    insertToken: '9.1093837015e-31',
    name: 'Electron Rest Mass',
    category: 'Physics',
    value: '9.1093837015 × 10⁻³¹',
    numericValue: 9.1093837015e-31,
    unit: 'kg',
    description: 'Mass of a stationary electron.',
  },
];

export interface SIPrefix {
  prefix: string;
  symbol: string;
  exponent: number;
  factor: string;
}

export const SI_PREFIXES: SIPrefix[] = [
  { prefix: 'quetta', symbol: 'Q', exponent: 30, factor: '10³⁰' },
  { prefix: 'ronna', symbol: 'R', exponent: 27, factor: '10²⁷' },
  { prefix: 'yotta', symbol: 'Y', exponent: 24, factor: '10²⁴' },
  { prefix: 'zetta', symbol: 'Z', exponent: 21, factor: '10²¹' },
  { prefix: 'exa', symbol: 'E', exponent: 18, factor: '10¹⁸' },
  { prefix: 'peta', symbol: 'P', exponent: 15, factor: '10¹⁵' },
  { prefix: 'tera', symbol: 'T', exponent: 12, factor: '10¹²' },
  { prefix: 'giga', symbol: 'G', exponent: 9, factor: '10⁹' },
  { prefix: 'mega', symbol: 'M', exponent: 6, factor: '10⁶' },
  { prefix: 'kilo', symbol: 'k', exponent: 3, factor: '10³' },
  { prefix: 'hecto', symbol: 'h', exponent: 2, factor: '10²' },
  { prefix: 'deca', symbol: 'da', exponent: 1, factor: '10¹' },
  { prefix: 'deci', symbol: 'd', exponent: -1, factor: '10⁻¹' },
  { prefix: 'centi', symbol: 'c', exponent: -2, factor: '10⁻²' },
  { prefix: 'milli', symbol: 'm', exponent: -3, factor: '10⁻³' },
  { prefix: 'micro', symbol: 'μ', exponent: -6, factor: '10⁻⁶' },
  { prefix: 'nano', symbol: 'n', exponent: -9, factor: '10⁻⁹' },
  { prefix: 'pico', symbol: 'p', exponent: -12, factor: '10⁻¹²' },
  { prefix: 'femto', symbol: 'f', exponent: -15, factor: '10⁻¹⁵' },
  { prefix: 'atto', symbol: 'a', exponent: -18, factor: '10⁻¹⁸' },
  { prefix: 'zepto', symbol: 'z', exponent: -21, factor: '10⁻²¹' },
  { prefix: 'yocto', symbol: 'y', exponent: -24, factor: '10⁻²⁴' },
];

export interface UnitDefinition {
  id: string;
  label: string;
  symbol: string;
  toBase: (val: number) => number;
  fromBase: (val: number) => number;
}

export interface UnitCategory {
  id: string;
  name: string;
  units: UnitDefinition[];
}

const linear = (id: string, label: string, symbol: string, factorToBase: number): UnitDefinition => ({
  id,
  label,
  symbol,
  toBase: (v) => v * factorToBase,
  fromBase: (v) => v / factorToBase,
});

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    name: 'Length',
    units: [
      linear('m', 'Meter', 'm', 1),
      linear('km', 'Kilometer', 'km', 1000),
      linear('cm', 'Centimeter', 'cm', 0.01),
      linear('mm', 'Millimeter', 'mm', 0.001),
      linear('um', 'Micrometer', 'μm', 1e-6),
      linear('nm', 'Nanometer', 'nm', 1e-9),
      linear('in', 'Inch', 'in', 0.0254),
      linear('ft', 'Foot', 'ft', 0.3048),
      linear('yd', 'Yard', 'yd', 0.9144),
      linear('mi', 'Mile', 'mi', 1609.344),
      linear('au', 'Astronomical Unit', 'AU', 1.495978707e11),
      linear('ly', 'Light Year', 'ly', 9.4607304725808e15),
    ],
  },
  {
    id: 'mass',
    name: 'Mass',
    units: [
      linear('kg', 'Kilogram', 'kg', 1),
      linear('g', 'Gram', 'g', 0.001),
      linear('mg', 'Milligram', 'mg', 1e-6),
      linear('ug', 'Microgram', 'μg', 1e-9),
      linear('t', 'Metric Tonne', 't', 1000),
      linear('lb', 'Pound', 'lb', 0.45359237),
      linear('oz', 'Ounce', 'oz', 0.028349523125),
      linear('u', 'Atomic Mass Unit', 'u', 1.6605390666e-27),
    ],
  },
  {
    id: 'temperature',
    name: 'Temperature',
    units: [
      { id: 'K', label: 'Kelvin', symbol: 'K', toBase: (v) => v, fromBase: (v) => v },
      { id: 'C', label: 'Celsius', symbol: '°C', toBase: (v) => v + 273.15, fromBase: (v) => v - 273.15 },
      { id: 'F', label: 'Fahrenheit', symbol: '°F', toBase: (v) => (v - 32) * (5 / 9) + 273.15, fromBase: (v) => (v - 273.15) * (9 / 5) + 32 },
      { id: 'R', label: 'Rankine', symbol: '°R', toBase: (v) => v * (5 / 9), fromBase: (v) => v * (9 / 5) },
    ],
  },
  {
    id: 'energy',
    name: 'Energy',
    units: [
      linear('J', 'Joule', 'J', 1),
      linear('kJ', 'Kilojoule', 'kJ', 1000),
      linear('MJ', 'Megajoule', 'MJ', 1e6),
      linear('cal', 'Calorie (thermochemical)', 'cal', 4.184),
      linear('kcal', 'Kilocalorie', 'kcal', 4184),
      linear('Wh', 'Watt-hour', 'Wh', 3600),
      linear('kWh', 'Kilowatt-hour', 'kWh', 3.6e6),
      linear('eV', 'Electronvolt', 'eV', 1.602176634e-19),
      linear('BTU', 'British Thermal Unit', 'BTU', 1055.05585262),
    ],
  },
  {
    id: 'pressure',
    name: 'Pressure',
    units: [
      linear('Pa', 'Pascal', 'Pa', 1),
      linear('kPa', 'Kilopascal', 'kPa', 1000),
      linear('MPa', 'Megapascal', 'MPa', 1e6),
      linear('bar', 'Bar', 'bar', 1e5),
      linear('atm', 'Standard Atmosphere', 'atm', 101325),
      linear('torr', 'Torr / mmHg', 'Torr', 101325 / 760),
      linear('psi', 'Pound per Square Inch', 'psi', 6894.757293168),
    ],
  },
  {
    id: 'velocity',
    name: 'Velocity',
    units: [
      linear('ms', 'Meters per second', 'm/s', 1),
      linear('kmh', 'Kilometers per hour', 'km/h', 1 / 3.6),
      linear('mph', 'Miles per hour', 'mph', 0.44704),
      linear('kn', 'Knot', 'kn', 1852 / 3600),
      linear('c', 'Speed of Light', 'c', 299792458),
    ],
  },
  {
    id: 'angle',
    name: 'Angle',
    units: [
      linear('rad', 'Radian', 'rad', 1),
      linear('deg', 'Degree', '°', Math.PI / 180),
      linear('grad', 'Gradian', 'gon', Math.PI / 200),
      linear('arcmin', 'Arcminute', '′', Math.PI / 10800),
      linear('arcsec', 'Arcsecond', '″', Math.PI / 648000),
      linear('rev', 'Revolution / Turn', 'rev', 2 * Math.PI),
    ],
  },
  {
    id: 'time',
    name: 'Time',
    units: [
      linear('s', 'Second', 's', 1),
      linear('ms', 'Millisecond', 'ms', 1e-3),
      linear('us', 'Microsecond', 'μs', 1e-6),
      linear('ns', 'Nanosecond', 'ns', 1e-9),
      linear('min', 'Minute', 'min', 60),
      linear('h', 'Hour', 'h', 3600),
      linear('d', 'Day', 'd', 86400),
      linear('yr', 'Julian Year', 'yr', 31557600),
    ],
  },
  {
    id: 'data',
    name: 'Digital Storage',
    units: [
      linear('B', 'Byte', 'B', 1),
      linear('KB', 'Kilobyte (10³)', 'KB', 1e3),
      linear('MB', 'Megabyte (10⁶)', 'MB', 1e6),
      linear('GB', 'Gigabyte (10⁹)', 'GB', 1e9),
      linear('TB', 'Terabyte (10¹²)', 'TB', 1e12),
      linear('KiB', 'Kibibyte (2¹⁰)', 'KiB', 1024),
      linear('MiB', 'Mebibyte (2²⁰)', 'MiB', 1048576),
      linear('GiB', 'Gibibyte (2³⁰)', 'GiB', 1073741824),
      linear('bit', 'Bit', 'bit', 0.125),
    ],
  },
];

export function convertUnit(categoryId: string, fromId: string, toId: string, value: number): number | null {
  const cat = UNIT_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat || !Number.isFinite(value)) return null;
  const fromUnit = cat.units.find((u) => u.id === fromId);
  const toUnit = cat.units.find((u) => u.id === toId);
  if (!fromUnit || !toUnit) return null;
  return toUnit.fromBase(fromUnit.toBase(value));
}
