const fetch = require("node-fetch");
const pokeList = require("./pokemon.json").pokemon;
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

// must pass in { id: "..." }
var generalInfo = pokeObj =>
  pokeFetch(`pokemon/${pokeObj.id}`).then(res =>
    Object.assign({}, pokeObj, {
      name: res.name,
      height: res.height,
      weight: res.weight,
      types: res.types.map(obj => obj.type.name),
    }),
  );

var recurseEvolutionTree = tree => {
  if (tree.evolves_to.length === 0) return false;
  let allEvol = {};
  tree.evolves_to.forEach(singleEvol => allEvol[singleEvol.species.name] = recurseEvolutionTree(singleEvol));
  return allEvol;
}

// must pass in { id: "..." }
var evolutionInfo = pokeObj =>
  pokeFetch(`pokemon-species/${pokeObj.id}`)
    .then(res => pokeFetch(res.evolution_chain.url, false))
    .then(res => Object.assign({}, pokeObj, { evolutions: { [res.chain.species.name]: recurseEvolutionTree(res.chain) } }));

// This funciton is recursively called for each pokemon.
// To add more fields to pull, just chain onto the last .then
// before the final one.
var runScript = (i=1, formattedPokemonObj={}) =>
  generalInfo({id: i})
    .then(obj => evolutionInfo(obj))
    .then(obj => {
      console.log(`Got information for ${obj.name}`)
      Object.assign(formattedPokemonObj, { [obj.name]: obj });
      if (i <= pokeList.length) runScript(++i, formattedPokemonObj);
      else fs.writeFile("../formattedPokemon.json", JSON.stringify(formattedPokemonObj), err => console.log(err ? err : "The file was saved!"));
    });

runScript();
