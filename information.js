const clientToken = require("./data/private").apiAiClientToken;
const app = require("apiai")(clientToken);
var numeral = require("numeral");
const pokeStore = require("./data/pokemon");
var arrayToText = require("./lib/arrayToText.js");

var information = (req, res) => {
  const { pokemonName, requestType, requestFrom } = parseRequest(req.body);
  if (!pokemonName)
    return res.json(assembleResponse(pokemon404("that pokemon"), requestFrom));
  const pokemon = pokeStore[pokemonName.toLowerCase()];
  var response;

  if (!pokemon) response = pokemon404(pokemonName); // no pokemon found
  else {
    switch(requestType) {
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
        response = size(pokemon);
        break;
      case "information":
      default:
        response = generalInfo(pokemon);
        break;
    }
  }

  res.json(assembleResponse(response, requestFrom));
}

// Typical pokedex entry
var generalInfo = pokemon =>
  `${pokemon.name}, the ${pokemon.genera} pokemon. ${chooseRandom(pokemon.flavorText)}`;

// Gets the type of the pokemon
var type = pokemon => `${pokemon.name} is type ` + arrayToText(pokemon.types);

var evolution = (pokemon, preEvolution=false) => {
  let textArray = [];
  if (preEvolution) {
    // has a pre-evolution
    if (pokemon.preEvolution)
      textArray.push(`${pokemon.name} evolves from ${pokemon.preEvolution.name} when it ${pokemon.preEvolution.conditions}`);
    else
      textArray.push(`${pokemon.name} is not known to evolve from any other pokemon`);
  } else {
    // has at least 1 evolution
    if (pokemon.evolutions && pokemon.evolutions.length > 0) {
      textArray.push(`${pokemon.name} evolves into ${pokemon.evolutions[0].name} when it ${pokemon.evolutions[0].conditions}`);
      // has more than 1 evolution
      for (i=1; i<pokemon.evolutions.length; i++)
        textArray.push(`it evolves into ${pokemon.evolutions[i].name} when it ${pokemon.evolutions[i].conditions}`);
    } else
      textArray.push(`${pokemon.name} is not known to evolve into any other pokemon`);
  }
  return arrayToText(textArray);
}

var size = pokemon =>
  `${pokemon.name} is ${decimeterToImperial(pokemon.height)} tall and weighs ${hectogramToImperial(pokemon.weight)}`;

module.exports = information;

// ------------------ HELPER FUNCTIONS ----------------------------//
const GOOGLE = "GOOGLE";
const AMAZON = "AMAZON";
const DEC_PER_FOOT = 3.048;
const HEC_PER_POUND = 4.536;
const INCHES_PER_FOOT = 12;
const MAX_SESSION_ID = 1000000;

var hectogramToImperial = hec => `${numeral(hec).divide(HEC_PER_POUND).format("0.0")} pounds`;

var decimeterToImperial = dec => {
  var feet = dec / DEC_PER_FOOT;
  if (feet >= 1)
    return `${numeral(feet).format("0.0")} feet`;
  else
    return `${numeral(feet).multiply(INCHES_PER_FOOT).format("0.0")} inches`;
}

var chooseRandom = (array, num=1) => {
  let textArray = [];
  for (i=0; i<num; i++) textArray.push(array[Math.floor(Math.random()*array.length)]);
  return arrayToText(textArray);
}

// Assembles the response that API.AI or Amazon expects
var assembleResponse = (answer, from) => {
  console.log(answer);
  return from === GOOGLE ? {
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
}

var pokemon404 = name => `I'm sorry, I don't know about ${name}`
var invalidRequest = type => `I'm sorry, I don't understand ${type}`

var parseAlexaType = type => {
  if (["information", "info", "about"].indexOf(type) !== -1) return "information";
  else if (["type"].indexOf(type) !== -1) return "type";
  else if (["evolve into", "evolution"].indexOf(type) !== -1) return "evolution";
  else if (["pre-evolution", "pre evolution", "evolve from"].indexOf(type) !== -1) return "pre-evolution";
  else if (["size", "big", "tall", "heavy", "weigh"].indexOf(type) !== -1) return "size";
  else return "";
}
// convert to Promise for easier handling
var parseRequest = req => {
  console.log(JSON.stringify(req));
  return req.result ? {
    pokemonName: req.result.parameters["pokemon-name"][0],
    requestType: req.result.parameters["request-type"],
    requestFrom: GOOGLE,
  } : {
    pokemonName: req.request.intent.slots.pokemonnameslot.value,
    requestType: parseAlexaType(req.request.intent.slots.requesttypeslot.value),
    requestFrom: AMAZON,
  };
}
