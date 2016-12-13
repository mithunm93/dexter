const pokeStore = require("./data/pokemon");

var parseAmazonType = type => {
  if (["information", "info", "about"].indexOf(type) !== -1) return "information";
  else if (["type"].indexOf(type) !== -1) return "type";
  else if (["evolve into", "evolution"].indexOf(type) !== -1) return "evolution";
  else if (["pre-evolution", "pre evolution", "evolve from"].indexOf(type) !== -1) return "pre-evolution";
  else if (["size", "big", "tall", "heavy", "weigh"].indexOf(type) !== -1) return "size";
  else return "";
}

// Assembles the response that API.AI or Amazon expects
var assembleResponse = answer =>
  requestFrom === "GOOGLE" ? {
    speech: answer,
    displayText: answer,
    data: {},
    contextOut: [],
    source: "pokeApi",
  } : {
    version: "1.0",
    response: {
      outputSpeech: {
        type: "PlainText",
        text: answer,
      },
    },
  };

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

var requestFrom;
var information = (req, res) => {
  var pokemonName = "";
  var requestType = "";

  if (req.body.result) {            // request from Google Home
    requestFrom = "GOOGLE";
    pokemonName = req.body.result.parameters["pokemon-name"][0].toLowerCase();
    requestType = req.body.result.parameters["request-type"];
  } else if (req.body.request) {    // request from Amazon Alexa
    requestFrom = "AMAZON";
    pokemonName = req.body.request.intent.slots.pokemonnameslot.value.toLowerCase();
    requestType = parseAmazonType(req.body.request.intent.slots.requesttypeslot.value);
  }

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
var type = pokemon => `${pokemon.name} is type ` + arrayToText(pokemon.types);

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
