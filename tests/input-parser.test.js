var assert = require('assert');
var parser = require('../utils/input-parser.js');

assert.deepStrictEqual(parser.parseInput('河水湖海'), ['河', '水', '湖', '海']);
assert.deepStrictEqual(parser.parseInput('医院 银行'), ['医院', '银行']);
assert.deepStrictEqual(parser.parseInput('医院，银行、医院'), ['医院', '银行']);
assert.deepStrictEqual(parser.parseInput('abc123'), []);
assert.deepStrictEqual(parser.parseInput('河水abc'), ['河', '水']);
assert.deepStrictEqual(parser.parseInput('  医院   银行  '), ['医院', '银行']);

console.log('All input parser tests passed.');
