// Assembles a text list from an array
// Example: array = ["dogs", "cats", "horses"]
//          text = "dogs, cats, and horses
//          array = ["ice cream", "brownies"], useOr = true
//          text = "ice cream or brownies"
var arrayToText = (array, useOr=false) => {
  if (!array || array.length === 0) return "";
  else if (array.length === 1) return array[0];
  else if (array.length > 1) {
    let conjunction = useOr ? "or" : "and";
    let l = array.length;
    let comma = (l > 2) ? ',' : '';
    let text = `${array[l-2]}${comma} ${conjunction} ${array[l-1]}`
    for (i=l-3; i>=0; i--) text = `${array[i]}, ${text}`;
    return text;
  }
}

module.exports = arrayToText;
