const fetch = require("node-fetch");
const pokeID = require("./pokeID");
const pokeAPIUrl =  "http://pokeapi.co/api/v2/";

var information = (req, res) => {
  const pokemonName = req.body.result.parameters["pokemon-name"].toLowerCase(),
        requestType = req.body.result.parameters["request-type"];
  const id = pokeID[pokemonName];
  var response;

  if (!id); // no pokemon found

  switch(requestType) {
    case "information":
      response = generalInfo(id);
      break;
    case "type":
      response = type(pokemonName);
      break;
    case "evolution":
      break;
    case "pre-evolution":
      break;
    case "size":
      break;
    default:
      break;
  }
  response.then(answer => res.json(assembleResponse(answer)));
};

// Assembles the response that API.ai expects
var assembleResponse = answer => ({ speech: answer, displayText: answer });

// Assembles a text list from an array
// Example: array = ["dogs", "cats", "horses"]
//          text = "dogs, cats, and horses
//          array = ["ice cream", "brownies"]
//          text = "ice cream and brownies"
var arrayToText = array => {
  if (!array || array.length === 0) return "";
  else if (array.length === 1) return array[0];
  else if (array.length > 1) {
    let l = array.length;
    let comma = (l > 2) ? ',' : '';
    let text = `${array[l-2]}${comma} and ${array[l-1]}`
    for (i=l-3; i>=0; i--) text = `${array[i]}, ${text}`;
    return text;
  }
}

var generalInfo = id => {
};

// Gets the type of the pokemon
var type = name => {
  return fetch(pokeAPIUrl+`pokemon/${name}`).then(res => res.json()).then(res => {
    if (!res["types"]) return `No type found for ${name}`;
    let typeArr = res["types"].map(obj => obj["type"]["name"]);
    return `${name} is type ` + arrayToText(typeArr);
  });
};

module.exports = information;
