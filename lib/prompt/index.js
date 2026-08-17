'use strict';

const faithful = require('./faithful.js');
const developer = require('./developer.js');
const specification = require('./specification.js');

const prompts = { faithful, developer, specification };

function systemPromptForMode(mode) {
  return prompts[mode] || faithful;
}

module.exports = { faithful, systemPromptForMode };
