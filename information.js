const clientToken = require("./data/private").apiAiClientToken;
const app = require("apiai")(clientToken);
var numeral = require("numeral");
var map = require("lodash/map");
var filter = require("lodash/filter");
const pokeStore = require("./data/pokemon");
const typeStore = require("./data/types");
var arrayToText = require("./lib/arrayToText.js");

var information = (req, res) => {
  const { pokemonName, typeName, requestType, requestFrom } = parseRequest(req.body);
  var response, pokemon;
  if (pokemonName && pokemonName.length > 0)
    pokemon = pokeStore[pokemonName.toLowerCase()];

  // could check weaknesses against a pokemon or a type
  if (requestType === "type-strength" || requestType === "type-weakness")
    response = typeStrengths(pokemon, typeName, requestType === "type-strength");
  else if (requestType === "random") response = random(typeName);
  else if (requestType === "help") response = help();
  else if (pokemon) {
    switch (requestType) {
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
  } else response = pokemon404("that pokemon"); // no pokemon found

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

var typeStrengths = (pokemon, typeName, isStrength) => {
  let types, text, superEffective = [], notVeryEffective = [], noEffect = [];
  let doublDamage, halfDamage, noDamage;
  let damageTaken = {};

  if (pokemon)
    types = pokemon.types.map(t => typeStore[t]);
  else
    types = [typeStore[typeName]];

  for (let t of types) {
    for (let dDType of t.double_damage_from)
      damageTaken[dDType] = (dDType in damageTaken) ? damageTaken[dDType]*2 : 2;
    for (let hDType of t.half_damage_from)
      damageTaken[hDType] = (hDType in damageTaken) ? damageTaken[hDType]*0.5 : 0.5;
    for (let nDType of t.no_damage_from)
      damageTaken[nDType] = (nDType in damageTaken) ? damageTaken[nDType]*0 : 0;
  }

  for (let t of Object.keys(damageTaken)) {
    if (damageTaken[t] === 0) noEffect.push(t);
    else if (damageTaken[t] > 1) superEffective.push(t);
    else if (damageTaken[t] < 1) notVeryEffective.push(t);
  }

  // I'm assuming the user would say something like:
  //   "what is strong against Clefairy" or
  //   "what is strong against fire"
  // so we want to tell the user the weakness of that pokemon or type.
  // It's a little awkward to ask what something is weak against, but
  // I imagine that won't be that common.
  if (isStrength)
    text = `${arrayToText(superEffective)} type moves are super effective against `;
  else {
    text = `${arrayToText(notVeryEffective)} type moves are not very effective `
    if (noEffect.length > 0)
      text += `and ${arrayToText(noEffect)} type moves do no damage `
    text += "against ";
  }

  if (pokemon)
    text = text + `${pokemon.name}, a ${arrayToText(types.map(t => t.name))} type pokemon`;
  else
    text = text + `pokemon of type ${arrayToText(types.map(t => t.name))}`;

  return text;
};

// Give the general info from a random pokemon
var random = type => generalInfo(randomPokemon(type));

var help = () => "Hello my name is dexter, ask me about pokemon. Here are some things you can say: "
  + arrayToText([`Tell me about ${randomPokemon().name}`,
  `What does ${randomPokemon().name} evolve into?`,
  `What does ${randomPokemon().name} evolve from?`,
  `How big is ${randomPokemon().name}?`,
  "Give me a random pokemon",
  "What is strong against fire?",
  `What is strong against ${randomPokemon().name}?`,
  "What is weak against poison?",
  "Help"]);

module.exports = information;

// ------------------ HELPER FUNCTIONS ----------------------------//
const GOOGLE = "GOOGLE";
const AMAZON = "AMAZON";
const DEC_PER_FOOT = 3.048;
const HEC_PER_POUND = 4.536;
const INCHES_PER_FOOT = 12;
const MAX_SESSION_ID = 1000000;

var randomPokemon = type => {
  if (type) {
    let pokeTypeObj = map(pokeStore, pokemon => ({ name: pokemon.name, types: pokemon.types }));
    let pokemonOfType = filter(pokeTypeObj, o => o.types.indexOf(type) !== -1);
    return pokeStore[chooseRandom(map(pokemonOfType, o => o.name))];
  } else
    return pokeStore[chooseRandom(Object.keys(pokeStore))];
}

var hectogramToImperial = hec => `${numeral(hec).divide(HEC_PER_POUND).format("0.0")} pounds`;

var decimeterToImperial = dec => {
  var feet = dec / DEC_PER_FOOT;
  if (feet >= 1)
    return `${numeral(feet).format("0.0")} feet`;
  else
    return `${numeral(feet).multiply(INCHES_PER_FOOT).format("0.0")} inches`;
}

var chooseRandom = (array, num=1) => {
  let arr = [];
  for (i=0; i<num; i++) arr.push(array[Math.floor(Math.random()*array.length)]);
  return (arr.length > 1) ? arr : arr[0];
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
  else if (["random"].indexOf(type) !== -1) return "random";
  else if (["strong against", "good against", "super effective"].indexOf(type) !== -1) return "type-strength";
  else if (["weak against", "bad against", "not very effective", "not effective"].indexOf(type) !== -1) return "type-weakness";
  else if (["evolve into", "evolution"].indexOf(type) !== -1) return "evolution";
  else if (["pre-evolution", "pre evolution", "evolve from"].indexOf(type) !== -1) return "pre-evolution";
  else if (["size", "big", "tall", "heavy", "weigh"].indexOf(type) !== -1) return "size";
  else return "";
}

var parseRequest = req => {
  console.log(JSON.stringify(req));
  return req.result ? {
    pokemonName: req.result.parameters["pokemon-name"],
    typeName: req.result.parameters["type-name"],
    requestType: req.result.parameters["request-type"],
    requestFrom: GOOGLE,
  } : {
    pokemonName: req.request.intent.slots.pokemonnameslot.value,
    typeName: req.request.intent.slots.typenameslot.value,
    requestType: parseAlexaType(req.request.intent.slots.requesttypeslot.value),
    requestFrom: AMAZON,
  };
}
