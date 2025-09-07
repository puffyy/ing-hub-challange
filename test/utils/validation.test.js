import {expect} from '@open-wc/testing';
import {
  DEPARTMENTS,
  formatErrors,
  POSITIONS,
  req,
  validate,
  validateEmployee,
} from '../../src/utils/validation.js';

// Small helpers
const iso = (d) => {
  // Format date to YYYY-MM-DD in UTC
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const addDays = (date, n) => {
  // Add n days to a given date
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

const BASE = {
  firstName: 'Alice',
  lastName: 'Smith',
  // birth 1990 → employed 2020 (>=15y and order correct)
  birthDate: '1990-01-01',
  employmentDate: '2020-01-01',
  phone: '+1 (212) 555-0123',
  email: 'alice@example.com',
  department: 'Analytics',
  position: 'Junior',
};

suite('utils/validation', () => {
  suite('exported enums', () => {
    test('DEPARTMENTS & POSITIONS are as expected', () => {
      // Assert department and position enums
      expect(DEPARTMENTS).to.deep.equal(['Analytics', 'Tech']);
      expect(POSITIONS).to.deep.equal(['Junior', 'Medior', 'Senior']);
    });
  });

  suite('req()', () => {
    test('pushes a required error object when value is empty', () => {
      const out = [];
      req('', 'emp.email', out); // Validate empty value
      expect(out).to.deep.equal([{type: 'required', labelKey: 'emp.email'}]);
    });

    test('does not push when value is present', () => {
      const out = [];
      req('hello', 'emp.email', out); // Validate non-empty value
      expect(out).to.deep.equal([]);
    });
  });

  suite('validateEmployee()', () => {
    test('returns [] for a fully valid DTO', () => {
      // Assert no errors for valid employee data
      const errs = validateEmployee({...BASE});
      expect(errs).to.deep.equal([]);
    });

    test('required fields short-circuit (only required errors returned)', () => {
      const errs = validateEmployee({});
      // Assert 8 required fields
      expect(errs.length).to.equal(8);
      expect(errs.every((e) => e.type === 'required')).to.be.true;
      // Ensure no other errors are added
      const hasNonRequired = errs.some((e) => e.type !== 'required');
      expect(hasNonRequired).to.be.false;
    });

    test('name length errors (first & last name)', () => {
      const errs = validateEmployee({
        ...BASE,
        firstName: 'A', // too short
        lastName: 'B', // too short
      });
      // Assert name length errors
      expect(errs).to.deep.include.members([
        {type: 'name_length', labelKey: 'emp.firstName', min: 2, max: 50},
        {type: 'name_length', labelKey: 'emp.lastName', min: 2, max: 50},
      ]);
    });

    test('invalid email format', () => {
      const errs = validateEmployee({
        ...BASE,
        email: 'not-an-email',
      });
      // Assert invalid email error
      expect(errs).to.deep.include({
        type: 'email_invalid',
        labelKey: 'emp.email',
      });
    });

    test('invalid phone format (too few digits)', () => {
      const errs = validateEmployee({
        ...BASE,
        phone: '123',
      });
      // Assert invalid phone error
      expect(errs).to.deep.include({
        type: 'phone_invalid',
        labelKey: 'emp.phone',
      });
    });

    test('invalid department & position (enum)', () => {
      const errs = validateEmployee({
        ...BASE,
        department: 'Marketing',
        position: 'Lead',
      });
      // Assert invalid department and position errors
      expect(errs).to.deep.include.members([
        {
          type: 'enum_invalid',
          labelKey: 'emp.department',
          allowed: DEPARTMENTS,
        },
        {
          type: 'enum_invalid',
          labelKey: 'emp.position',
          allowed: POSITIONS,
        },
      ]);
    });

    test('invalid dates (parse failure)', () => {
      const errs = validateEmployee({
        ...BASE,
        birthDate: '1990-13-01', // invalid month
        employmentDate: '2020-02-30', // invalid day
      });
      // Assert invalid date errors
      expect(errs).to.deep.include.members([
        {type: 'date_invalid', labelKey: 'emp.birthDate'},
        {type: 'date_invalid', labelKey: 'emp.employmentDate'},
      ]);
    });

    test('future dates (birth & employment)', () => {
      const today = new Date();
      const future = iso(addDays(today, 5)); // safely > today

      const errs = validateEmployee({
        ...BASE,
        birthDate: future,
        employmentDate: future,
      });
      // Assert future date errors
      expect(errs).to.deep.include.members([
        {type: 'date_future', labelKey: 'emp.birthDate'},
        {type: 'date_future', labelKey: 'emp.employmentDate'},
      ]);
    });

    test('employment before birth', () => {
      const errs = validateEmployee({
        ...BASE,
        birthDate: '2000-01-01',
        employmentDate: '1999-12-31',
      });
      // Assert employment before birth error
      expect(errs).to.deep.include({
        type: 'employment_after_birth',
        empKey: 'emp.employmentDate',
        birthKey: 'emp.birthDate',
      });
    });

    test('age minimum (15 years)', () => {
      const errs = validateEmployee({
        ...BASE,
        birthDate: '2010-01-01', // too young
        employmentDate: '2024-01-01', // 14 years after
      });
      // Assert age minimum error
      expect(errs).to.deep.include({
        type: 'age_min',
        labelKey: 'emp.employmentDate',
        minYears: 15,
      });
    });
  });

  suite('validate.* field helpers', () => {
    test('firstName / lastName', () => {
      // Assert first name validation
      expect(validate.firstName('A')).to.deep.equal([
        {type: 'name_length', labelKey: 'emp.firstName', min: 2, max: 50},
      ]);
      expect(validate.firstName('Al')).to.deep.equal([]);

      // Assert last name validation
      expect(validate.lastName('B')).to.deep.equal([
        {type: 'name_length', labelKey: 'emp.lastName', min: 2, max: 50},
      ]);
      expect(validate.lastName('Bo')).to.deep.equal([]);
    });

    test('email', () => {
      // Assert email validation
      expect(validate.email('bad')).to.deep.equal([
        {type: 'email_invalid', labelKey: 'emp.email'},
      ]);
      expect(validate.email('ok@ex.com')).to.deep.equal([]);
    });

    test('phone', () => {
      // Assert phone validation
      expect(validate.phone('123')).to.deep.equal([
        {type: 'phone_invalid', labelKey: 'emp.phone'},
      ]);
      expect(validate.phone('+1 (212) 555-0123')).to.deep.equal([]);
    });

    test('department / position', () => {
      // Assert department validation
      expect(validate.department('Nope')[0]).to.deep.include({
        type: 'enum_invalid',
        labelKey: 'emp.department',
      });
      expect(validate.department('Analytics')).to.deep.equal([]);

      // Assert position validation
      expect(validate.position('Nope')[0]).to.deep.include({
        type: 'enum_invalid',
        labelKey: 'emp.position',
      });
      expect(validate.position('Junior')).to.deep.equal([]);
    });

    test('birthDate', () => {
      // Assert birth date validation
      expect(validate.birthDate('1990-13-01')).to.deep.equal([
        {type: 'date_invalid', labelKey: 'emp.birthDate'},
      ]);
      const future = iso(addDays(new Date(), 10));
      expect(validate.birthDate(future)).to.deep.equal([
        {type: 'date_future', labelKey: 'emp.birthDate'},
      ]);
      expect(validate.birthDate('1990-01-01')).to.deep.equal([]);
    });

    test('employmentDate (with & without context)', () => {
      // Assert employment date validation
      expect(validate.employmentDate('2020-13-01')).to.deep.equal([
        {type: 'date_invalid', labelKey: 'emp.employmentDate'},
      ]);
      const future = iso(addDays(new Date(), 10));
      expect(validate.employmentDate(future)).to.deep.equal([
        {type: 'date_future', labelKey: 'emp.employmentDate'},
      ]);

      // With context: employment before birth
      expect(
        validate.employmentDate('1999-01-01', {birthDate: '2000-01-01'})
      ).to.deep.equal([
        {
          type: 'employment_after_birth',
          empKey: 'emp.employmentDate',
          birthKey: 'emp.birthDate',
        },
      ]);

      // With context: too young (<15 years)
      expect(
        validate.employmentDate('2024-01-01', {birthDate: '2010-01-01'})
      ).to.deep.equal([
        {type: 'age_min', labelKey: 'emp.employmentDate', minYears: 15},
      ]);

      // Valid with context
      expect(
        validate.employmentDate('2020-01-01', {birthDate: '1990-01-01'})
      ).to.deep.equal([]);
    });
  });

  suite('formatErrors()', () => {
    test('passes through plain strings unchanged', () => {
      const out = formatErrors(['Something went wrong']);
      // Assert plain strings are unchanged
      expect(out).to.deep.equal(['Something went wrong']);
    });

    test('maps each structured error type to a human-readable string (fallbacks)', () => {
      const items = [
        {type: 'required', labelKey: 'emp.email'},
        {type: 'name_length', labelKey: 'emp.firstName', min: 2, max: 50},
        {type: 'email_invalid', labelKey: 'emp.email'},
        {type: 'phone_invalid', labelKey: 'emp.phone'},
        {
          type: 'enum_invalid',
          labelKey: 'emp.department',
          allowed: ['Analytics', 'Tech'],
        },
        {type: 'date_invalid', labelKey: 'emp.birthDate'},
        {type: 'date_future', labelKey: 'emp.employmentDate'},
        {
          type: 'employment_after_birth',
          empKey: 'emp.employmentDate',
          birthKey: 'emp.birthDate',
        },
        {type: 'age_min', labelKey: 'emp.employmentDate', minYears: 15},
        {type: 'unknown_code', message: 'Unexpected!'},
      ];

      const out = formatErrors(items);

      // Assert fallback English templates include expected tokens
      expect(out[0]).to.match(/(emp\.email|Email)/);
      expect(out[0]).to.contain('is required');

      expect(out[1]).to.match(/(emp\.firstName|First Name)/);
      expect(out[1]).to.contain('2');
      expect(out[1]).to.contain('50');

      expect(out[2]).to.match(/(emp\.email|Email)/);
      expect(out[2]).to.contain('invalid email');

      expect(out[3]).to.match(/(emp\.phone|Phone)/);
      expect(out[3]).to.contain('invalid phone');

      expect(out[4]).to.match(/(emp\.department|Department)/);
      expect(out[4]).to.contain('Analytics');
      expect(out[4]).to.contain('Tech');

      expect(out[5]).to.match(/(emp\.birthDate|Date of Birth|Birth Date)/);
      expect(out[5]).to.contain('invalid date');

      expect(out[6]).to.match(
        /(emp\.employmentDate|Date of Employment|Employment Date)/
      );
      expect(out[6]).to.contain('in the future');

      expect(out[7]).to.match(
        /(emp\.employmentDate|Date of Employment|Employment Date)/
      );
      expect(out[7]).to.match(/(emp\.birthDate|Date of Birth|Birth Date)/);
      expect(out[7]).to.contain('must be after');

      expect(out[8]).to.match(
        /(emp\.employmentDate|Date of Employment|Employment Date)/
      );
      expect(out[8]).to.contain('15');

      // Unknown type → fallback to message
      expect(out[9]).to.equal('Unexpected!');
    });
  });
});
