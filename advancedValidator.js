

let validator;
(() => {
   const APPROVED = Symbol();
   const EMAIL_RECIPIENT_MAX_SIZE = 64;
   const EMAIL_DOMAIN_MAX_SIZE = 255;
   const EMAIL_RECIPIENT_UNIQUE_CHARACTERS = "!#$%&'*+-/=?^_`{|}~";
   const EMAIL_DPART_MAX_SIZE = 63;


   class SimpleValidator {
      constructor(func, msg, oprtionalValidator) {
         this.func = func;
         this.msg = msg;
         if (oprtionalValidator) this.optional = true;
      }
      setNewMessage(newMsg) {
         this.newMsg = newMsg;
      }
      reset() {
         this.newMsg = null;
      }
   }
   class ArrayErrorValidation extends Array { }


   const requiredValidator = new SimpleValidator(target => target !== undefined && target !== null && target !== NaN, "target is required");
   const optionalValidator = new SimpleValidator(target => target === undefined || target === null || target === NaN, "", true);

   class AbstractValidator {
      constructor(msg) {
         this.validators = [requiredValidator];
         this.addMainValidator(msg);

      }
      weakValidation(targetVal, rootAncestor) {
         const { validators } = this;
         const first = validators[0];
         if (first.optional && first.func(targetVal, rootAncestor, first)) return APPROVED;
         if (!first.optional && !first.func(targetVal, rootAncestor, first)) return first.newMsg || first.msg;
         for (let i = 1; i < validators.length; ++i) {
            const validObj = validators[i];
            if (validObj.is(SimpleValidator) && !validObj.func(targetVal, rootAncestor, validObj)) {
               const { msg, newMsg } = validObj;
               validObj.reset();
               return newMsg || msg;
            }
            else if (validObj instanceof AbstractValidator) {
               const result = validObj.weakValidation(targetVal, rootAncestor, validObj);
               if (result !== APPROVED) return result;
            }

         }

         return APPROVED;
      }
      addMainValidator(msg) {
         const { constructor: co } = this;
         const { mainValidator } = co;
         this.validators.push(msg && new SimpleValidator(mainValidator.func, msg) || mainValidator);
      }
      required(msg) {
         if (msg) return this.validators[0] = new SimpleValidator(requiredValidator.func, msg);
         this.validators[0] = requiredValidator;
         return this;
      }
      enum(values, msg, equality) {
         if (!equality) this.validators.push(new SimpleValidator(target => values.find(e => e === target), msg || `no value match for target`));
         else this.validators.push(new SimpleValidator(target => values.find(e => equality(target, e)), msg || `no value match for target`));
         return this;
      }
      enumKey(keysPath, msg, equality = (v1, v2) => v1 === v2) {
         this.validators.push(new SimpleValidator((target, rootAncestor, simpleValidator) => {
            let values = rootAncestor;
            try {
               for (let key of keysPath) values = values[key];
               if (!values.isIterable()) return !msg && simpleValidator.setNewMessage(`key path ends in uniterable object of type ${values.constructor.name}`);
               for (let val of values) {
                  if (equality(target, val)) return true;
               }

            } catch (e) {
               return !msg && simpleValidator.setNewMessage(`key path ${keysPath.toString()} faild recived error:"${e.message}"`);

            }
         }, msg || "key dosent match any of the allowed values"));
         return this;
      }
      custom(func, msg) {
         this.validators.push(new SimpleValidator(func, msg));
         return this;
      }
      optional() {
         this.validators[0] = optionalValidator;
         return this;
      }
      sameAs(keyPath, equality = (v1, v2) => v1 === v2, msg) {
         return this.custom((target, rootAncestor, sv) => {
            let val = rootAncestor;
            try {
               let k = keyPath.last();
               for (let key of keyPath) val = val[key];
               return equality(target, val) || (!msg && sv.setNewMessage(`target dosent equal to "${k}" value:"${val}"`));
            } catch (e) {
               return !msg || sv.setNewMessage(`key path (${keyPath}) failed recived error: "${e.message}"`);
            }

         }, msg);

      }


   }
   AbstractValidator.prototype.strongValidation = AbstractValidator.prototype.weakValidation;

   class ObjectValidator extends AbstractValidator {
      static mainValidator = new SimpleValidator(target => typeof target === 'object' && !target.isIterable(), "target is not an object");
      constructor(schema, msg) {
         super(msg);
         this.schema = schema;


      }
      weakValidation(targetObj, rootAncestor) {
         const result = AbstractValidator.prototype.weakValidation.call(this, targetObj, rootAncestor);
         console.log(result.constructor);
         if (result !== APPROVED) return result;
         let keys = targetObj.keys();
         let hasError;
         let errObj = {};
         for (let key of keys) {
            const validItem = this.schema[key];
            if (!validItem) continue;
            const result = validItem.weakValidation(targetObj[key], rootAncestor);
            if (result === APPROVED) continue;
            hasError = true;
            errObj[key] = result;
         }
         return hasError ? errObj : APPROVED;
      }
      strongValidation(targetObj, rootAncestor) {
         const result = AbstractValidator.prototype.strongValidation.call(this, targetObj, rootAncestor);
         if (result !== APPROVED) return result;
         let targetKeys = targetObj.keys();
         let schemaKeys = this.schema.keys();
         let errObj = {};
         let hasError;
         if (targetKeys.length > schemaKeys.length) return `target has too many keys`;
         if (!targetKeys.every(key => schemaKeys.includes(key))) return `target object contains keys that dont exist in the schema`
         for (let key of schemaKeys) {
            const validItem = this.schema[key];
            const result = validItem.strongValidation(targetObj[key], rootAncestor);
            if (result === APPROVED) continue;
            hasError = true;
            errObj[key] = result;
         }
         return hasError ? errObj : APPROVED;
      }

   }

   class StringValidator extends AbstractValidator {
      static mainValidator = new SimpleValidator(target => target.constructor === String, "not a string");

      hex(msg = "not a hexadecimal number") {
         return this.custom(target => {

            for (let c of target) if (!c.isDigit() && !(c >= 'a' && c <= 'f') && !(c >= 'A' && c <= 'F')) return;
            return true;
         }, msg);

      }
      float(digitsToLeft, digitsToRight, msg) {
         msg = msg || `number of digits to the left or the right of the decimal point is too large! maximum of ${digitsToLeft} to the left and maximum of ${digitsToRight} to the right`;
         return this.custom((target, rootAncestor, simpleValidator) => {
            let df = digitsToLeft;
            let dr = digitsToRight;
            let dotIndex;
            for (let i = 0; i < target.length; ++i) {
               const c = target[i];
               if (c === '.') {
                  dotIndex = i;
                  break;
               }
               if (!c.isDigit()) return;

               --df;

            }
            if (!dotIndex || dotIndex === target.lastIndex() || df < 0) return;

            for (let i = dotIndex + 1; i < target.length; ++i) {
               const c = target[i];
               if (!c.isDigit()) return;
               --dr;
            }
            return dr >= 0;

         }, msg);

      }
      number(msg = "text is not a number") {
         return this.custom(target => Number(target) !== NaN, msg);

      }
      file(suffixes, msg) {
         const defMsg = `file is not allowed, approved files ${suffixes}`;
         return this.custom((target, rootAncestor, sv) => {
            const lastIndexOfDot = target.lastIndexOf(".");
            if (lastIndexOfDot < 0) return !msg && sv.setNewMessage(`target is not a file`);
            const suffix = target.substring(lastIndexOfDot, target.length);
            return suffixes.find(s => s === suffix);
         }, msg || defMsg);
      }
      date(formatPattern, msg) {
         if (formatPattern.length != 3) throw new Error("date fromat size must be 3! recived \"" + formatPattern + "\"");
         let d, m, y;
         for (let c of formatPattern) {
            d = d || c === 'd';
            m = m || c === 'm';
            y = y || c === 'y';
         }
         if (!(y && d && m)) throw new Error("date format must contain the following 3 characters 'ymd' and each character can only appear once")
         return this.custom((target, rootAncestor, simpleValidator) => {
            let numsInDate = [0];
            for (let c of target) {
               if (c === '/') {
                  numsInDate.push(0);
                  continue;
               }
               if (!c.isDigit()) return !msg && simpleValidator.setNewMessage("date can only contain digts and / character");
               const num = numsInDate[numsInDate.lastIndex()];
               numsInDate[numsInDate.lastIndex()] = (num * 10) + (c - '0');

            }
            if (numsInDate.length !== formatPattern.length) return;
            let day;
            let month;
            let year;
            for (let i = 0; i < formatPattern.length; ++i) {
               const c = formatPattern[i];
               const num = numsInDate[i];

               switch (c) {
                  case 'y':
                     year = num;
                     if (!num.between(0, 9999)) return !msg && simpleValidator.setNewMessage("supported years are between 0 to 9999 AC recived " + year);
                     break;
                  case 'm':
                     month = num;
                     if (!num.between(1, 12)) return !msg && simpleValidator.setNewMessage(`mounths are between 1 to 12 recived ${month}`);
                     break;
                  case 'd':
                     day = num;
                     if (!num.between(1, 31)) return !msg && simpleValidator.setNewMessage("days are between 1 to 31 recived " + day);
                     break;
               }
            }
            let isLeapYear = (year % 4) === 0 && (((year % 100) !== 0) || ((year % 400) === 0));
            if (isLeapYear) {
               if (month === 2 && day > 29) return !msg && simpleValidator.setNewMessage("february in leap year has  29 days");
            } else if (month === 2 && day > 28) return !msg && simpleValidator.setNewMessage("february in has  28 days");
            if (month.evalSet(4, 6, 9, 11) && day > 30) return !msg && simpleValidator.setNewMessage("mounths 4,6,9,11 has 30 days");
            return true;
         }, msg || "invalid date");

      }
      /*const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return re.test(email);*/
      email(msg) {
         return this.custom((email, ro, sv) => {
            if (email[0].evalChars(".@")) return !msg && sv.setNewMessage(`email address can not starts with @ or .`);
            let atSignIndex;
            let dotFound;
            for (let i = 0; i < email.length; ++i) {
               const c = email[i];
               if (c === '@') {
                  atSignIndex = i;
                  break;
               }
               if (!c.isDigit() && !c.isLetter() && !c.evalChars(EMAIL_RECIPIENT_UNIQUE_CHARACTERS))
                  return !msg && sv.setNewMessage(`email address host can only contain digits, english letters and the characters ${EMAIL_RECIPIENT_UNIQUE_CHARACTERS}`);
               if (dotFound && c === '.') return !msg && sv.setNewMessage(`trailing dots are not allowed`);
            }
            if (atSignIndex >= EMAIL_RECIPIENT_MAX_SIZE)
               return !msg &&
                  sv.setNewMessage(`email address host max size is 64 current size ${dotIndex}`);

            if (email[atSignIndex + 1].evalChars('-.') || email.last().evalChars('-.'))
               return !msg && sv.setNewMessage(`email domain can not start or end with (-.)`);

            const domainSize = email.length - atSignIndex - 1;
            console.log(domainSize);
            if (domainSize > EMAIL_DOMAIN_MAX_SIZE)
               return !msg && sv.setNewMessage(`email domain maximum size is ${EMAIL_DOMAIN_MAX_SIZE} current size ${domainSize}`);

            let countUntilDot = 0;
            let digitCount = 0;
            let dotCount = 0;
            for (let i = atSignIndex + 1; i < email.length; ++i) {
               const c = email[i];
               let isDigit = c.isDigit();
               let isDot = c === '.';
               dotCount = isDot ? dotCount + 1 : dotCount;
               digitCount = isDigit ? digitCount + 1 : digitCount;
               if (isDot) {
                  if (countUntilDot > EMAIL_DPART_MAX_SIZE) return !msg && sv.setNewMessage(`email domain max text size  between .  ${EMAIL_DPART_MAX_SIZE} invalid part size ${countUntilDot}`);
                  countUntilDot = 0;
                  continue;
               }
               if (c === '-' || isDigit || c.isLetter()) ++countUntilDot;
               else return !msg && sv.setNewMessage(`email domain can only contain didits,letters,and - character`);

            }
            if (digitCount === (domainSize - dotCount)) return !msg && sv.setNewMessage(`its not allowed for the entire email domain to contain digits`);
            return true;
         }, msg || 'invalid email');

      }
      length(min, max, msg) {
         //`number of characters exceed range of ${min} to ${max}`
         if (min > max) throw new Error("min is bigger then max ");
         return this.custom((target, rootAncestor, sv) => target.length.between(min, max) || (!msg && sv.setNewMessage(`number of characters is out of range of ${min} to ${max},current character size is ${target.length}`)), msg || "");

      }
      alphanum(msg = `text can contain only the following charactyers(A-Za-z0-9)`) {
         return this.custom(target => {
            for (let c of target) if (!target.isLetter() && !target.isDigit()) return;
            return true;
         }, msg)

      }
      integer(msg = "not an integer") {
         return this.custom(target => {
            for (let c of target) if (!c.isDigit()) return;
            return true;
         }, msg)
      }
      regex(regex, msg = "target not match regex") {
         return this.custom(target => regex.test(target), msg);
      }
      password(specialCharacters, msg) {


         if (includeUniqueCahracters) return this.custom((target, rootAncestor, simpleValidator) => {
            let foundDigit;
            let foundLowerCase;
            let foundUpperCase;
            let founduniqueCharcter;
            for (let c of target) {
               foundDigit = foundDigit || c.isDigit();
               foundLowerCase = foundLowerCase || c.isLowerCase();
               foundUpperCase = foundUpperCase || c.isUpperCase();
               founduniqueCharcter = founduniqueCharcter || (c >= '!' && c <= '/') || (c >= ':' && c <= '@') || (c >= '[' && c <= '`') || (c >= '{' && c <= '~');
            }
            if (!foundDigit) return !msg && simpleValidator.setNewMessage("at least one digit is required is your password");
            if (!foundLowerCase) return !msg && simpleValidator.setNewMessage("at least one lower case letter is required is your password");
            if (!foundUpperCase) return !msg && simpleValidator.setNewMessage("at least one upper case letter is required is your password");
            if (!founduniqueCharcter) return !msg && simpleValidator.setNewMessage("at least one unique letter is required is your password");
            return true;
         }, msg);
         return this.custom((target) => {
            let foundDigit;
            let foundLowerCase;
            let foundUpperCase;
            for (let c of target) {
               foundDigit = foundDigit || c.isDigit();
               foundLowerCase = foundLowerCase || c.isLowerCase();
               foundUpperCase = foundUpperCase || c.isUpperCase();

            }
            if (!foundDigit) return !msg && simpleValidator.setNewMessage("at least one digit is required is your password");
            if (!foundLowerCase) return !msg && simpleValidator.setNewMessage("at least one lower case letter is required is your password");
            if (!foundUpperCase) return !msg && simpleValidator.setNewMessage("at least one upper case letter is required is your password");
            return true;
         }, msg || "your password is insufficient")

      }
      charSet(charSets, msg) {
         if (!charSets.length.isEven()) throw new Error(`charsets doesn't have even number of characters`);
         return this.custom((target, ro, sv) => {
            for (let c of target) {
               let isValid;
               B: for (let i = 0; i < charSets.length; i += 2)if (c >= charSets[i] && c <= charSets[i + 1]) {
                  isValid = true;
                  break B;
               }
               if (!isValid) return false;
            }
            return true;
         }, msg || `one or more characters not matching allowed charcter sets (${charSets})`)
      }
      url(options, msg) {
         options = options || {};
         const { hosts, protocols, domains } = options;
         return this.custom((target, ro, sv) => {
            try {
               const url = new URL(target);
               const protcol = url.protocol.cutLast();
               const { hostname } = url;

               if (protocols && !protocols.includes(protcol)) return !msg && sv.setNewMessage(`protcol ${protcol} not matching any of the allowed protocols (${protocols})`);
               if (!hosts && !domains) return true;
               let host = [];
               for (let c of hostname) {
                  if (c === '.') break;
                  host.push(c);
               }
               host = host.join('');
               let domain = hostname.substring(host.length);
               if (hosts && !hosts.includes(host)) return !msg && sv.setNewMessage(`host ${host} not include in list of allowed hosts (${hosts})`);
               if (domains && !domains.includes(domain)) return !msg && sv.setNewMessage(`domain ${domain} not include in the list of allowed domains (${domains})`);
               return true;
            } catch (e) {
               return !msg && sv.setNewMessage(`invalid url`);
            }
         }, msg || `invalid url`);
      }
   }
   class NumberValidator extends AbstractValidator {
      static mainValidator = new SimpleValidator(target => target.isNumber(), "not a number");

      integer(msg = "not an integer") {
         return this.custom(target => Math.floor(target) === target, msg);
      }
      float(digitsToLeft, digitsToRight, msg = `number of digits to left of decimal point or to the right is too large number allowed to the left is ${digitsToLeft} and ${digitsToRight} to the right `) {
         return this.custom(target => {
            target = target.toString();
            let df = digitsToLeft;
            let dr = digitsToRight;
            let dotIndex;
            for (let i = 0; i < target.length; ++i) {
               const c = target[i];
               if (c === '.') {
                  dotIndex = i;
                  break;
               }
               if (!c.isDigit()) return;

               --df;

            }
            if (!dotIndex || dotIndex === target.lastIndex() || df < 0) return;

            for (let i = dotIndex + 1; i < target.length; ++i) {
               const c = target[i];
               if (!c.isDigit()) return;
               --dr;
            }
            return dr >= 0;

         }, msg)
      }
      range(min, max, msg = `number is not in range of ${min} to ${max}`) {
         return this.custom(target => target.between(min, max), msg);
      }
      odd(msg = "require an odd number") {
         return this.custom(target => target.isOdd(), msg);
      }
      even(msg = "require an even number") {
         return this.custom(target => target.isEven(), msg);
      }
      positive(msg = "require a positve number") {
         return this.custom(target => target >= 0, msg);
      }
      negetive(msg = "require a negetive number") {
         return this.custom(target => target < 0, msg);
      }
      divisible(numbers, or, msg) {
         if (numbers.includes(0)) throw new Error(`0 is not a valid option for "divisble" function`)
         if (or) return this.custom(target => numbers.find(num => (target % num) === 0), msg || `number is not divisble by any of the allowed denominators (${numbers})`);
         else return this.custom(target => numbers.every(num => (target % num) === 0), msg || `number is not divisble by all of the allowed denominators (${numbers})`);
      }
      count(max, msg = "integer number of digits is too large maximum allowed " + max) {
         return this.custom(target => {
            let m = max - 1;
            let compare = 10;
            while (compare <= target) {
               compare *= 10;
               --m;
            }
            return m >= 0;

         }, msg)
      }
   }
   class BooleanValidator extends AbstractValidator {
      static mainValidator = new SimpleValidator(target => target.isBoolean(), "not a boolean");

   }
   class ArrayValidator extends AbstractValidator {
      static mainValidator = new SimpleValidator(target => target.isArray(), "not an array");
      length(min, max, msg = `array length is not in range of ${min} to ${max}`) {
         if (min > max) throw new Error("min is bigger then max ");
         return this.custom(target => target.length.between(min, max), msg);
      }
      items() {
         if (!this.validItems) this.validItems = [];
         for (let validatorObj of arguments) {
            if (!(validatorObj instanceof AbstractValidator)) throw new Error("items function of array validator require Validator objects");
            this.validItems.push(validatorObj);

         }
         return this;
      }
      weakValidation(targetArray, rootAncestor) {
         const result = AbstractValidator.prototype.weakValidation.call(this, targetArray, rootAncestor);
         if (result !== APPROVED) return result;
         let errArray = [];
         let hasError;
         const { validItems: items } = this;
         for (let i = 0; i < targetArray.length; ++i) {
            const val = targetArray[i];
            let valueErrorArray = [];
            B: for (let validObj of items) {
               const res = validObj.weakValidation(val, rootAncestor);
               if (res === APPROVED) continue;
               valueErrorArray.push(res);
            }
            if (valueErrorArray.length === items.length) {
               errArray[i] = valueErrorArray.length === 1 ? valueErrorArray[0] : valueErrorArray;
               hasError = true;
            }
         }
         return hasError ? errArray : APPROVED;
      }
      strongValidation(targetArray, rootAncestor) {
         const result = AbstractValidator.prototype.strongValidation.call(this, targetArray, rootAncestor);
         if (result !== APPROVED) return result;
         let errArray = [];
         let hasError;
         const { validItems: items } = this;
         for (let i = 0; i < targetArray.length; ++i) {
            const val = targetArray[i];
            let valueErrorArray = new ArrayErrorValidation();

            B: for (let validObj of items) {
               const res = validObj.strongValidation(val, rootAncestor);
               if (res === APPROVED) continue;
               valueErrorArray.push(res);
            }

            if (valueErrorArray.length === items.length) {
               errArray[i] = valueErrorArray.length === 1 ? valueErrorArray[0] : valueErrorArray;
               hasError = true;
            }

         }
         return hasError ? errArray : APPROVED;
      }

   }
   // ArrayValidator.prototype.strongValidation = ArrayValidator.prototype.weakValidation;
   validator = { ArrayValidator, BooleanValidator, StringValidator, ObjectValidator, NumberValidator, AbstractValidator };
   validator.object = (schema, msg) => new ObjectValidator(schema, msg);
   validator.array = (msg) => new ArrayValidator(msg);
   validator.boolean = (msg) => new BooleanValidator(msg);
   validator.number = (msg) => new NumberValidator(msg);
   validator.string = (msg) => new StringValidator(msg);
   validator.weakValidation = (objValidtor, objTest) => {
      const result = objValidtor.weakValidation(objTest, objTest);
      if (result !== APPROVED) return { hasError: true, errData: result };
      return {};
   }
   validator.strongValidation = (objValidtor, objTest) => {
      const result = objValidtor.strongValidation(objTest, objTest);
      if (result !== APPROVED) return { hasError: true, errData: result };
      return {};
   }
})();