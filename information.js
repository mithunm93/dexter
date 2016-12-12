const pokeStore = require("./data/pokemon");

// Assembles the response that API.ai expects
var assembleResponse = answer => ({ speech: answer, displayText: answer });
var pokemon404 = name => `I'm sorry, I don't know about ${name}`
var invalidRequest = type => `I'm sorry, I don't understand ${type}`

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

var information = (req, res) => {
  const pokemonName = req.body.result.parameters["pokemon-name"].toLowerCase();
  const requestType = req.body.result.parameters["request-type"];
  const pokemon = pokeStore[pokemonName];
  var response;

  if (!pokemon) response = pokemon404(pokemonName); // no pokemon found
  else {
    switch(requestType) {
      case "information":
        response = generalInfo(pokemon);
        break;
      case "type":
        response = type(pokemon);
        break;
      case "evolution":
        response = evolution(pokemon)
        break;
      case "pre-evolution":
        response = evolution(pokemon, true);
        break;
      case "size":
        break;
      default:
        response = invalidRequest(requestType);
        break;
    }
  }

  res.json(assembleResponse(response));
};

var chooseRandom = (array, num=1) => {
  let textArray = [];
  for (i=0; i<num; i++)
    textArray.push(array[Math.floor(Math.random()*array.length)]);
  return arrayToText(textArray);
}

// Typical pokedex entry
var generalInfo = pokemon =>
  `${pokemon.name}, the ${pokemon.genera} pokemon.${chooseRandom(pokemon.flavorText)}`;

// Gets the type of the pokemon
var type = pokemon => `${name} is type ` + arrayToText(typeArr);

var evolution = (pokemon, preEvolution=false) => {
  let textArray = [];
  if (preEvolution){
    if (pokemon.preEvolution)
      textArray.push(`${pokemon.name} evolves from ${pokemon.preEvolution.name} when it ${pokemon.preEvolution.conditions}`);
    else
      textArray.push(`${pokemon.name} is not known to evolve from any other pokemon`);
  } else {
    if (pokemon.evolutions && pokemon.evolutions.length > 0) {
      textArray.push(`${pokemon.name} evolves into ${pokemon.evolutions[0].name} when it ${pokemon.evolutions[0].conditions}`);
      for (i=1; i<pokemon.evolutions.length; i++)
        textArray.push(`it evolves into ${pokemon.evolutions[i].name} when it ${pokemon.evolutions[i].conditions}`);
    } else
      textArray.push(`${pokemon.name} is not known to evolve into any other pokemon`);
  }
  return arrayToText(textArray);
}

module.exports = information;
