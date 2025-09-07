// Import translation function
import {t} from '../i18n/i18n.js';

// Allowed values for departments and positions
export const DEPARTMENTS = ['Analytics', 'Tech'];
export const POSITIONS = ['Junior', 'Medior', 'Senior'];

/**
 * Error objects — not plain text, only code + arguments:
 * { type: 'required', labelKey: 'emp.firstName' }
 * { type: 'name_length', labelKey: 'emp.firstName', min: 2, max: 50 }
 * { type: 'email_invalid', labelKey: 'emp.email' }
 * { type: 'phone_invalid', labelKey: 'emp.phone' }
 * { type: 'enum_invalid', labelKey: 'emp.department', allowed: ['Analytics','Tech'] }
 * { type: 'date_invalid', labelKey: 'emp.birthDate' }
 * { type: 'date_future', labelKey: 'emp.birthDate' }
 * { type: 'employment_after_birth', empKey: 'emp.employmentDate', birthKey: 'emp.birthDate' }
 * { type: 'age_min', labelKey: 'emp.employmentDate', minYears: 15 }
 */

// ---------- Public API ----------

export function validateEmployee(dto /*: EmployeeDTO*/) {
  const errs = [];

  // Check required fields
  req(dto.firstName, 'emp.firstName', errs);
  req(dto.lastName, 'emp.lastName', errs);
  req(dto.employmentDate, 'emp.employmentDate', errs);
  req(dto.birthDate, 'emp.birthDate', errs);
  req(dto.phone, 'emp.phone', errs);
  req(dto.email, 'emp.email', errs);
  req(dto.department, 'emp.department', errs);
  req(dto.position, 'emp.position', errs);

  // If there are required field errors, return immediately
  if (errs.length) return errs;

  // Validate names
  if (!isName(dto.firstName)) {
    errs.push({
      type: 'name_length',
      labelKey: 'emp.firstName',
      min: 2,
      max: 50,
    });
  }
  if (!isName(dto.lastName)) {
    errs.push({type: 'name_length', labelKey: 'emp.lastName', min: 2, max: 50});
  }

  // Validate email
  if (!isValidEmail(dto.email)) {
    errs.push({type: 'email_invalid', labelKey: 'emp.email'});
  }

  // Validate phone
  if (!isValidPhone(dto.phone)) {
    errs.push({type: 'phone_invalid', labelKey: 'emp.phone'});
  }

  // Validate enums
  if (!DEPARTMENTS.includes(dto.department)) {
    errs.push({
      type: 'enum_invalid',
      labelKey: 'emp.department',
      allowed: DEPARTMENTS,
    });
  }
  if (!POSITIONS.includes(dto.position)) {
    errs.push({
      type: 'enum_invalid',
      labelKey: 'emp.position',
      allowed: POSITIONS,
    });
  }

  // Validate dates
  const today = new Date();
  stripTime(today);
  const birth = parseISO(dto.birthDate);
  const employed = parseISO(dto.employmentDate);

  if (!birth) errs.push({type: 'date_invalid', labelKey: 'emp.birthDate'});
  if (!employed)
    errs.push({type: 'date_invalid', labelKey: 'emp.employmentDate'});

  if (birth && birth > today)
    errs.push({type: 'date_future', labelKey: 'emp.birthDate'});
  if (employed && employed > today)
    errs.push({type: 'date_future', labelKey: 'emp.employmentDate'});

  if (birth && employed && employed < birth) {
    errs.push({
      type: 'employment_after_birth',
      empKey: 'emp.employmentDate',
      birthKey: 'emp.birthDate',
    });
  }

  // Minimum age = 15 years
  if (birth && employed && yearsBetween(birth, employed) < 15) {
    errs.push({type: 'age_min', labelKey: 'emp.employmentDate', minYears: 15});
  }

  return errs;
}

/** Single-field helpers (optional, for field-blur validation in UI) */
export const validate = {
  firstName(v) {
    return isName(v)
      ? []
      : [{type: 'name_length', labelKey: 'emp.firstName', min: 2, max: 50}];
  },
  lastName(v) {
    return isName(v)
      ? []
      : [{type: 'name_length', labelKey: 'emp.lastName', min: 2, max: 50}];
  },
  email(v) {
    return isValidEmail(v)
      ? []
      : [{type: 'email_invalid', labelKey: 'emp.email'}];
  },
  phone(v) {
    return isValidPhone(v)
      ? []
      : [{type: 'phone_invalid', labelKey: 'emp.phone'}];
  },
  department(v) {
    return DEPARTMENTS.includes(v)
      ? []
      : [
          {
            type: 'enum_invalid',
            labelKey: 'emp.department',
            allowed: DEPARTMENTS,
          },
        ];
  },
  position(v) {
    return POSITIONS.includes(v)
      ? []
      : [{type: 'enum_invalid', labelKey: 'emp.position', allowed: POSITIONS}];
  },
  birthDate(v) {
    const d = parseISO(v);
    const today = new Date();
    stripTime(today);
    if (!d) return [{type: 'date_invalid', labelKey: 'emp.birthDate'}];
    if (d > today) return [{type: 'date_future', labelKey: 'emp.birthDate'}];
    return [];
  },
  employmentDate(v, ctx /* { birthDate?: string } */) {
    const d = parseISO(v);
    const today = new Date();
    stripTime(today);
    if (!d) return [{type: 'date_invalid', labelKey: 'emp.employmentDate'}];
    if (d > today)
      return [{type: 'date_future', labelKey: 'emp.employmentDate'}];
    if (ctx?.birthDate) {
      const b = parseISO(ctx.birthDate);
      if (b && d < b)
        return [
          {
            type: 'employment_after_birth',
            empKey: 'emp.employmentDate',
            birthKey: 'emp.birthDate',
          },
        ];
      if (b && yearsBetween(b, d) < 15)
        return [
          {type: 'age_min', labelKey: 'emp.employmentDate', minYears: 15},
        ];
    }
    return [];
  },
};

/**
 * Translate error list to the current language.
 * Call this during rendering — updates automatically when the language changes.
 */

function tf(key, fallback, params) {
  const s = t(key, params);
  return s == null || s === '' || s === key ? fallback : s;
}

export function formatErrors(errors) {
  return (errors || []).map((e) => {
    if (typeof e === 'string') return e; // backward compatibility
    switch (e?.type) {
      case 'required': {
        const label = t(e.labelKey) || e.labelKey; // keep label raw key if not translated
        // fallback string keeps your previous style; tests only check substring (e.g., "is required")
        return tf('errors.required', `${label}: is required.`, {label});
      }
      case 'name_length': {
        const label = t(e.labelKey) || e.labelKey;
        return tf(
          'errors.name_length',
          `${label}: must be ${e.min}–${e.max} letters.`,
          {label, min: e.min, max: e.max}
        );
      }
      case 'email_invalid': {
        const label = t(e.labelKey) || e.labelKey;
        return tf('errors.email_invalid', `${label}: invalid email format.`, {
          label,
        });
      }
      case 'phone_invalid': {
        const label = t(e.labelKey) || e.labelKey;
        return tf('errors.phone_invalid', `${label}: invalid phone number.`, {
          label,
        });
      }
      case 'enum_invalid': {
        const label = t(e.labelKey) || e.labelKey;
        const list = (e.allowed || []).join(', ');
        return tf('errors.enum_invalid', `${label}: must be one of ${list}.`, {
          label,
          list,
        });
      }
      case 'date_invalid': {
        const label = t(e.labelKey) || e.labelKey;
        return tf(
          'errors.date_invalid',
          `${label}: invalid date (YYYY-MM-DD).`,
          {label}
        );
      }
      case 'date_future': {
        const label = t(e.labelKey) || e.labelKey;
        return tf('errors.date_future', `${label}: cannot be in the future.`, {
          label,
        });
      }
      case 'employment_after_birth': {
        const emp = t(e.empKey) || e.empKey; // keep raw key if not translated
        const birth = t(e.birthKey) || e.birthKey;
        return tf(
          'errors.employment_after_birth',
          `${emp}: must be after ${birth}.`,
          {emp, birth}
        );
      }
      case 'age_min': {
        const label = t(e.labelKey) || e.labelKey;
        return tf(
          'errors.age_min',
          `${label}: employee must be at least ${e.minYears} years old.`,
          {label, minYears: e.minYears}
        );
      }
      default:
        return String(e?.message || e);
    }
  });
}

// ---------- internals ----------

export function req(v, labelKey, out) {
  if (v === undefined || v === null || String(v).trim() === '') {
    out.push({type: 'required', labelKey});
  }
}

function isName(v) {
  return /^[\p{L}][\p{L}\p{M}\s.'-]{1,48}$/u.test(v || '');
}

function isValidEmail(v) {
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v));
}

function isValidPhone(v) {
  if (!v) return false;
  const digits = String(v).replace(/\D+/g, '');
  if (digits.length < 10 || digits.length > 16) return false;
  return /^[+()\-.\s\d]+$/.test(String(v));
}

function parseISO(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return null;
  const [y, m, d] = s.split('-').map(Number);
  // build in UTC to avoid TZ drift
  const date = new Date(Date.UTC(y, m - 1, d));
  // If the date is invalid, toISOString() will throw — guard first:
  if (Number.isNaN(date.getTime())) return null;
  // normalize back to 'YYYY-MM-DD' to verify correctness (catches Feb-30 etc.)
  const iso = date.toISOString().slice(0, 10);
  return iso === s ? date : null;
}

function stripTime(d) {
  d.setHours(0, 0, 0, 0);
  return d;
}

function yearsBetween(a, b) {
  let y = b.getUTCFullYear() - a.getUTCFullYear();
  const m = b.getUTCMonth() - a.getUTCMonth();
  const d = b.getUTCDate() - a.getUTCDate();
  if (m < 0 || (m === 0 && d < 0)) y -= 1;
  return y;
}
