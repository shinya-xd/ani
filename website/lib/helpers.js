RegExp.escape = function(string) {
  return string.replace(/[-\/\\^$*+?.()|[\]{}!=:,]/g, '\\$&')
};

String.prototype.cleanWhitespace = function() {
  return this.replace(/\s+/g, ' ').trim();
};

String.prototype.cleanQuery = function() {
  return this.cleanWhitespace().toLowerCase();
};

encodeURIComponentReplaceSpaces = function(string, spacer=undefined) {
  string = encodeURIComponent(string);
  if (typeof spacer === 'undefined') {
    return string;
  } else {
    return string.replace(/%20/g, spacer);
  }
};

String.prototype.count = function(string) {
  return (this.match(new RegExp(RegExp.escape(string), 'g')) || []).length;
};

Array.prototype.empty = function() {
  return this.length === 0;
};

Array.prototype.hasPartialObjects = function(object) {
  for (let i = 0; i < this.length; i++) {
    if (Object.keys(object).reduce((total, key) => {
      return total && this[i][key] === object[key];
    }, true)) {
      return true;
    }
  }
  return false;
};

Array.prototype.getPartialObjects = function(object) {
  return this.filter((value) => {
    return Object.keys(object).reduce((total, key) => {
      return total && value[key] === object[key];
    }, true);
  });
};

Array.prototype.removePartialObjects = function(object) {
  return this.filter((value) => {
    return !Object.keys(object).reduce((total, key) => {
      return total && value[key] === object[key];
    }, true);
  });
};

isNumeric = function(num) {
  return !isNaN(parseFloat(num)) && isFinite(num);
};

String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.substr(1);
};

String.prototype.replaceEnd = function(from, to, caseInsensitive=false) {
  if (from.source) {
    from = from.source;
    caseInsensitive = caseInsensitive || from.ignoreCase;
  } else {
    from = RegExp.escape(from);
  }

  let flags = caseInsensitive ? 'i' : '';
  let regex = new RegExp(from + '$', flags);

  return this.replace(regex, to);
};

String.prototype.replaceStart = function(from, to, caseInsensitive=false) {
  if (from.source) {
    from = from.source;
    caseInsensitive = caseInsensitive || from.ignoreCase;
  } else {
    from = RegExp.escape(from);
  }

  let flags = caseInsensitive ? 'i' : '';
  let regex = new RegExp('^' + from, flags);

  return this.replace(regex, to);
};
