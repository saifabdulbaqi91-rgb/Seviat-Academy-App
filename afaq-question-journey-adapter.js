(function(host){
'use strict';

function createContext(options){
  const o = options || {};
  const rules = o.rules;
  const profile = o.profile;
  const letter = o.letter;
  const mapping = o.mapping;

  if (!rules || !profile || !mapping ||
      typeof rules.evidence !== 'function' ||
      typeof mapping.resolve !== 'function' ||
      !Array.isArray(rules.nodes)) {
    throw Error('Missing journey dependencies');
  }

  const nodes = new Map(rules.nodes.map(n => [n.id, n]));

  function confirmed(id, visited = new Set()){
    const node = nodes.get(id);

    if (!node) return false;
    if (profile.overrides?.[id] === 'lock') return false;
    if (visited.has(id)) return false;

    const hasEvidence =
      profile.legacyEvidence?.[id] === true ||
      rules.evidence(profile,id) === true;

    if (!hasEvidence) return false;

    const nextVisited = new Set(visited);
    nextVisited.add(id);

    return node.requires.every(
      requiredId => confirmed(requiredId, nextVisited)
    );
  }

  function skillReady(skill, targetLetter = letter){
    const entry = mapping.resolve(skill);

    if (!entry ||
        entry.relation !== 'exact-name' ||
        !entry.journey ||
        !targetLetter) {
      return false;
    }

    return confirmed(targetLetter + ':' + entry.journey);
  }

  function letterReady(value){
    return confirmed(value + ':letter-shape');
  }

  function targetAvailable(skill, targetLetter = letter){
    const entry = mapping.resolve(skill);

    if (!entry ||
        entry.relation !== 'exact-name' ||
        !entry.journey ||
        !targetLetter) {
      return false;
    }

    const id = targetLetter + ':' + entry.journey;
    const node = nodes.get(id);

    if (!node) return false;
    if (profile.overrides?.[id] === 'lock') return false;

    return rules.available(profile, node) === true;
  }

  return Object.freeze({
    skillReady,
    targetAvailable,
    letterReady,
    confirmed
  });
}

const api = Object.freeze({createContext});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else {
  host.AfaqQuestionJourneyAdapter = api;
}

})(typeof window === 'undefined' ? globalThis : window);
