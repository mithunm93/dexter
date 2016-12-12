const pickBy = require("lodash/pickby");
const fetch = require("node-fetch");
const pokeList = require("./formatted_pokemon.json").pokemon;
const evolCondText = require("./evolution_conditions.json")
const fs = require('fs');

/*
 * This script exits to fetch data from the pokeapi: https://pokeapi.co/
 * and format it in a way that serves our purposes. The pokeapi is often
 * slow to respond, for the sake of quickness and because the api.ai webhook
 * will only wait 5 seconds for a request, it makes sense to store the data
 * locally.
 *
 * In the interest of not spamming the actual API to scrape their data, the
 * server should be set up locally prior to running this service, directions
 * can be found here: https://github.com/PokeAPI/pokeapi/ . After setting up
 * the server as described on that page, you can run this script.
 *
 * pokemon.json contains a list of all the pokemon names in lower case, but this
 * script only requires that array to be of a certain size. It could technically
 * be omitted for a `const numPokemon = x`.
 *
 * NOTE: This script will probably take forever since it has to make a bunch of
 * requests for every single pokemon.
 */

const pokeUrl = "http://localhost:8000/api/v2/";
var pokeFetch = (action, append=true) => fetch(append ? pokeUrl+action : action).then(res => res.json());
var isEnglish = text => text.language.name === "en";

// must pass in { id: "..." }
var generalInfo = pokeObj =>
  pokeFetch(`pokemon/${pokeObj.id}`).then(res =>{
    Object.assign({}, pokeObj, {
      name: res.name,
      height: res.height,
      weight: res.weight,
      types: res.types.map(obj => obj.type.name),
      moves: res.moves.map(move => moves.move.name),
    })
  });


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

var parseEvolutionDetails = tree =>
  arrayToText(tree.evolution_details.map(det => {
    let filteredConds = pickBy(det, (val, key) => val && val !== "" && key !== "trigger");
    let condArr = [];

    for (let cond in filteredConds) {
      let value = filteredConds[cond];
      if (typeof value === "object") value = value.name;
      condArr.push(evolCondText[cond]+value);
    }
    let conditions = arrayToText(condArr);

    switch (det.trigger.name) {
      case "level-up":
        if (!det.min_level) conditions += " and levels up";
        break;
      case "trade":
        conditions += " and is traded";
        break;
      case "shed":
        conditions += " sheds"
      default:
        break;
    }
    return conditions;
  }), true);

// must pass in { id: "...", name: "..." }
// needs to set evolutionChainUrl for future use
var evolutionChainUrl;
var speciesInfo = pokeObj =>
  pokeFetch(`pokemon-species/${pokeObj.id}`).then(res => {
    evolutionChainUrl = res.evolution_chain.url;
    let flavorText = res.flavor_text_entries.filter(isEnglish).map(text => text.flavor_text);
    let genera = res.genera.find(isEnglish).genus;
    return Object.assign({}, pokeObj, { flavorText, genera });
  });

// This method parses the evolution tree returned by this endpoint:
// http://pokeapi.co/docsv2/#evolution-chains
//
// tree: the evolution chain returned by the pokeApi evolution-chain endpoint
// pokemon: the name of the pokemon you want the evolutions for
// preEvolution: a hash containing { name: "...", conditions: [...] }
//   for the current pokemon's pre-evolution. In this case, current pokemon
//   refers to tree.species.name.
//
// This method returns a hash shaped like so:
//   {
//     preEvolution: { name: "...", conditions: ["..."] },
//     evolutions: [{ name: "...", conditions: ["..."] }, ... ],
//   }
//
//   The preEvolution is a hash with the name of the preEvolution of the
//   specified Pokemon, and the conditions upon which it evolves into the
//   current pokemon. evolutions is an array of evolutions from the current
//   pokemon shaped in the same way as preEvolution.
var recurseEvolutionTree = (tree, pokemon, preEvolution=null) => {
  let curPokemon = tree.species.name;
  if (curPokemon === pokemon) {
    return {
      preEvolution,
      evolutions: tree.evolves_to.map(evTo => ({
        name: evTo.species.name,
        conditions: parseEvolutionDetails(evTo),
      })),
    };
  } else if (tree.evolves_to.length > 0) {
    for (let evolution of tree.evolves_to) {
      let found = recurseEvolutionTree(
        evolution,
        pokemon,
        {
          name: curPokemon,
          conditions: parseEvolutionDetails(evolution),
        }
      );
      if (found) return found;
    }
  } else return false;
}

var evolutionInfo = pokeObj =>
  pokeFetch(evolutionChainUrl, false).then(res => {
    let obj = recurseEvolutionTree(res.chain, pokeObj.name);
    return Object.assign({}, pokeObj, obj);
  });

// This funciton is recursively called for each pokemon.
// To add more fields to pull, just chain onto the last .then
// before the final one.
var runScript = (i=1, formattedPokemonObj={}) =>
  generalInfo({id: i})
    .then(speciesInfo)
    .then(evolutionInfo)
    .then(pokeObj => {
      console.log(`Got information for ${obj.name}`)
      Object.assign(formattedPokemonObj, { [pokeObj.name]: pokeObj });
      if (i <= pokeList.length) runScript(++i, formattedPokemonObj);
      else fs.writeFile("../data/pokemon.json", JSON.stringify(formattedPokemonObj), err => console.log(err ? err : "The file was saved!"));
    });

runScript();
