(function(host){
'use strict';

const direct = [
  'letter-shape',
  'letter-name',
  'letter-sound',
  'letter-writing',
  'letter-positions',
  'letter-detection',
  'short-vowels',
  'long-vowels',
  'sukoon',
  'sound-analysis',
  'syllable-building',
  'word-reading',
  'word-writing'
];

const literacy = [
  'comprehension',
  'dictation',
  'independent-writing',
  'reading-fluency',
  'sentence-reading',
  'shaddah',
  'tanwin',
  'vowel-length'
];

const related = {
  'auditory-discrimination': 'letter-sound',
  'connected-forms': 'letter-positions',
  'tracing': 'letter-writing',
  'visual-contrast': 'letter-shape',
  'word-building': 'syllable-building'
};

const other = [
  'chant',
  'gender',
  'negation',
  'number',
  'oral-expression',
  'punctuation',
  'sentence-analysis',
  'sentence-kind',
  'sentence-order',
  'sun-lam',
  'synonyms'
];

const mapping = {};

for(const skill of direct){
  mapping[skill] = {
    journey: skill,
    evidence: null,
    relation: 'exact-name',
    automaticMastery: false
  };
}

for(const skill of literacy){
  mapping[skill] = {
    journey: null,
    evidence: skill,
    relation: 'supplemental-evidence',
    automaticMastery: false
  };
}

for(const [skill,journey] of Object.entries(related)){
  mapping[skill] = {
    journey,
    evidence: null,
    relation: 'related-not-equivalent',
    automaticMastery: false
  };
}

for(const skill of other){
  mapping[skill] = {
    journey: null,
    evidence: null,
    relation: 'requires-specific-review',
    automaticMastery: false
  };
}

Object.values(mapping).forEach(Object.freeze);
Object.freeze(mapping);

function resolve(skill){
  if(typeof skill !== 'string') return null;
  return mapping[skill] || null;
}

const api = Object.freeze({mapping,resolve});

if(typeof module !== 'undefined' && module.exports){
  module.exports = api;
}else{
  host.AfaqQuestionSkillMapping = api;
}

})(typeof window === 'undefined' ? globalThis : window);
