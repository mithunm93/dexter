const pokeStore = require("./formattedPokemon");

// Assembles the response that API.ai expects
var assembleResponse = answer => ({ speech: answer, displayText: answer });
var pokemon404 = name => `I'm sorry, I don't know about ${name}`
var invalidRequest = type => `I'm sorry, I don't understand ${type}`

var information = (req, res) => {
  const pokemonName = req.body.result.parameters["pokemon-name"].toLowerCase(),
  const requestType = req.body.result.parameters["request-type"];
  const pokemon = pokeStore[pokemonName];
  var response;

  if (!pokemon) response = pokemon404(name); // no pokemon found
  else {
    switch(requestType) {
      case "information":
        response = generalInfo(id);
        break;
      case "type":
        response = type(pokemon);
        break;
      case "evolution":
        response = evolution(pokemon)
        break;
      case "pre-evolution":
        response = evolution(pokemon, false);
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

var generalInfo = id => {
};

// Gets the type of the pokemon
var type = pokemon => {
  if (!pokemon.types) return `No type found for ${name}`;
  return `${name} is type ` + arrayToText(typeArr);
};


var searchEvolTree = (tree, pokemon) => {
  if (tree[pokemon])
}

var evolution = pokemon => {
  if (pokemon.evolutions)
}

module.exports = information;
