'use strict';

const faithful = require('./faithful.js');

module.exports = faithful + '\n\nThe user explicitly selected specification expansion. Added assumptions are allowed only when necessary and must appear under a final heading named "## Default assumptions". Keep the original request separate from those assumptions.';
