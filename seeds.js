(() => {
   let p = Object.prototype;
   p.pick = function () {
      let newObj = {};
      const props = arguments[0].isIterable() ? arguments[0] : arguments;
      newObj.__proto__ = this.__proto__;
      newObj.constructor = this.constructor;
      for (let i = 0; i < props.length; ++i)newObj[props[i]] = this[props[i]];
      return newObj;
   }
   p.pickNot = function () {
      let newObj = {};
      const excludedProps = arguments[0].isIterable() ? arguments[0] : arguments;
      const props = this.keys().filter(prop => !prop.evalSet(excludedProps));
      newObj.__proto__ = this.__proto__;
      newObj.constructor = this.constructor;
      for (let i = 0; i < props.length; ++i)newObj[props[i]] = this[props[i]];
      return newObj;
   }
   p.lastIndex = function () {
      return this.length - 1;
   }

   function deepClone(target) {
      let clone = {};
      let props = target.keys();
      for (let prop of props) clone[prop] = target[prop].clone(true);
      return clone;
   }

   p.clone = function (deep) {
      if (deep) return deepClone(this);
      let clone = {};
      clone.constructor = this.constructor;
      Object.assign(clone, this);
      clone.__proto__ = this.__proto__;
      return clone;
   }
   p.isEmpty = function () { return this.length === 0 }

   p.last = function () {
      return this[this.length - 1];
   }
   p.isArray = function () {
      return this.constructor === Array;
   }
   p.isSymbol = function () {
      return this.constructor === Symbol;
   }
   p.isFunction = function () {
      return this.constructor === Function;
   }
   p.isString = function () {
      return this.constructor === String;
   }
   p.isNumber = function () {
      return this.constructor === Number;
   }
   p.isBoolean = function () {
      return this.constructor === Boolean;
   }

   p.is = function (targetConstructor) {
      return targetConstructor === this.constructor;
   }
   p.isAny = function () {
      for (let cons of arguments) if (this.constructor === cons) return true;
      return false;
   }
   p.isIterable = function () {
      return Symbol.iterator in this && this.constructor !== String;
   }
   p.evalSet = function () {
      const args = arguments[0].isIterable() ? arguments[0] : arguments;
      for (let i = 0; i < args.length; ++i)if (this == args[i]) return true;

   }
   p.evalPredicate = function (args, biPredicate) {
      for (let arg of args) if (biPredicate(this, arg)) return true;
   }

   p.keys = function () {
      return Object.keys(this);
   }
   p.values = function () {
      return Object.values(this);
   }
   p.clear = function () {
      for (let a of this.keys()) delete this[a];
   }
   p.forEach = function (consumer) {
      let keys = this.keys();
      for (let prop of keys) consumer(prop, this[prop]);
   }
   p.map = function (mapper) {
      let keys = this.keys();
      for (let prop of keys) this[prop] = mapper(prop, this[prop]);
   }
   p.toJson = function () {
      return JSON.stringify(this);
   }
   p = Boolean.prototype;
   p.clone = p.valueOf;

   p = String.prototype;

   p.evalChars = function (chars) {
      if (this.length !== 1) return false;
      for (let c of chars) if (this === c) return true;

   }
   p.toPascalCase = function () {
      let build = [this[0].toUpperCase()];
      let toCapitalized;
      for (let i = 1; i < this.length; ++i) {
         if (toCapitalized) {
            toCapitalized = false;
            build.push(this[i].toUpperCase());
         }
         else if (toCapitalized = this[i] == ' ') continue;
         else build.push(this[i]);
      }
      return build.join('');
   }
   p.toCamelCase = function () {
      let build = [this[0].toLowerCase()];
      let toCapitalized;
      for (let i = 1; i < this.length; ++i) {
         if (toCapitalized) {
            toCapitalized = false;
            build.push(this[i].toUpperCase());
         }
         else if (toCapitalized = this[i] == ' ') continue;
         else build.push(this[i]);
      }
      return build.join('');
   }
   p.clone = p.valueOf;
   p.clearTrialing = function (pattern) {
      let { length } = pattern;
      let found = 0;
      let trailing = 0;
      let build = [];

      for (let i = 0, j = 0; i < this.length; ++i, j = (j + 1) % length) {
         build.push(this[i]);
         if (this[i] === pattern[j]) ++found;
         else trailing = 0;
         if (found === length) {
            trailing++;
            found = 0;
         }
         if (trailing === 2) {
            for (let a = 0; a < length; ++a)build.pop();
            trailing = 1;
         }

      }
      return build.join('');
   }
   p.isNum = function () {
      let foundDot;
      for (let c of this) {
         if (c.isDigit()) continue;
         if (c !== '.' || foundDot) return false;
         foundDot = true;
      }
      return true;
   }
   p.cutLast = function () {
      return this.substring(0, this.length - 1);
   }
   p.toObj = function () {
      return JSON.parse(this);
   }
   p.cutFirst = function () {
      return this.substring(1, this.length);
   }
   p.toNumber = function () {
      return Number(this);
   }


   p.isLowerCase = function () {
      return this >= 'a' && this <= 'z';
   }
   p.isUpperCase = function () {
      return this >= 'A' && this <= 'Z';
   }
   p.isLetter = function () {
      return this.isLowerCase() || this.isUpperCase();
   }
   p.isDigit = function () {
      return this >= '0' && this <= '9';
   }
   p.equalsIgnoreCase = function (str) {
      if (str.length !== this.length) return false;
      for (let i = 0; i < str.length; ++i) {
         if (this[i] === str[i]) continue;
         if (this[i].isLetter() && (this[i] + 32) === str[i] || (this[i] - 32) === str[i]) continue;
         return false;
      }
      return true;
   }
   p = Number.prototype;

   p.toJson = function () {
      return this.toString();
   }
   Math.randomInteger = function (max, allowNegatives) {
      if (allowNegatives) return Math.round((Math.random() * Math.randomInRange(-1, 1)) * max);
      return Math.round(Math.random() * max);
   }
   Math.randomInRange = function (min, max) {
      return Math.round(Math.random() * (max - min) + min)
   }

   p.between = function (min, max) {
      return this >= min && this <= max;
   }
   p.clone = p.valueOf;

   p.isDivisibleBy = function (num) {
      return (this % num) === 0;
   }
   p.isOdd = function () {
      return (this & 1) === 1
   }
   p.isEven = function () {
      return (this & 1) === 0;
   }
   p.isNegative = function () {
      return this < 0;
   }
   p.isPositive = function () {
      return this >= 0;
   }
   p.add = function () {
      let res = 0;
      res += this;
      for (let num of arguments) res += num;
      return res;
   }

   p = Array.prototype;
   p.hasTruthy = function () {
      for (let a of this) if (a) return true;
   }
   p.shuffle = function () {
      this.sort(() => Math.random() - 0.5);
   }

   p.forEach2D = function (consumer) {
      for (let i = 0; i < this.length; ++i)
         for (let j = 0; j < this[i].length; ++j)consumer(this[i], this[i][j], i, j);
   }
   p.map2D = function (map) {
      let res = [];
      for (let r = 0; r < this.length; ++r) {
         res.push([]);
         const curr = res.last();
         for (let c = 0; c < this[r].length; ++c)curr.push((map(this[r], this[r][c], r, c)));
      }
      return res;
   }
   p.filter2D = function (filter) {
      let res = [];
      for (let r = 0; r < this.length; ++r) {
         const curr = [];
         for (let c = 0; c < this[r].length; ++c)if (filter(this[r], this[r][c], r, c)) curr.push(this[r][c]);
         if (curr.length) res.push(curr);

      }
      return res;
   }

   p.clone = function (deep) {
      let res = [];
      for (let val of this) res.push(deep ? val.clone(deep) : val);
      return res;
   }

   p.clear = function () { this.length = 0; }

   p.binarySearchIndex = function (val, toNum, left = 0, right = this.length - 1) {
      val = toNum(val);
      let result = -1;
      while (left <= right) {
         let mid = Math.floor((left + right) / 2);
         let current = toNum(this[mid]);
         if (current > val) right = mid - 1;
         else if (current < val) left = mid + 1;
         else {
            result = mid;
            right = mid - 1;
         }
      }
      return result;
   }

   p.binarySearch = function (val, toNum, left, right) {
      return this[this.binarySearchIndex(val, toNum, left, right)]
   }
   p.binaryInsertion = function (val, toNum) {
      this.splice(this.binarySearchIndex(val, toNum), 0, val);
   }
   p.allTruthy = function () {
      for (let val of this) if (!val) return false;
      return true;
   }

   Array.combine = function () {
      let arr = [];
      for (let a of arguments) for (let val of a) arr.push(val);
      return arr;
   }
   Array.fill = function (val, size) {
      let res = [];
      for (let i = 0; i < size; ++i)res.push(val);
      return res;
   }
   Function.mix = function () {
      let functions = arguments;
      return function () {
         for (let func of functions) func(...arguments);
      }
   }
   p.remove = function (val) {
      return this.splice(this.findIndex(a => a == val), 1);
   }
   p.removeIndex = function (index) {
      return this.splice(index, 1);
   }
   p.add = function (index, vals) {
      if (this.length === 0 && index === 0) {
         if (vals.isArray()) return this.push(...vals);
         return this.push(vals);
      }
      if (vals, isArray()) return this.splice(index, 0, ...vals);
      this.splice(index, 0, vals);

   }
   Function.mixReducers = function () {
      let functions = arguments;
      if (functions.length === 0) return console.error('at least one funtion must be passed to Function.mixReducers as argument');
      return function () {
         let input = functions[0](...arguments);
         for (let i = 1; i < functions.length; ++i)input = functions[i](input);
         return input;
      }

   }

   Function.mock = function () {

   }


})();

(function () {
   if (typeof window !== 'undefined') return;
   let p = Buffer.prototype;
   p.toObj = function () {
      return JSON.parse(this.toString());
   };
})();