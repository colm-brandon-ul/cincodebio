import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';

import { SHA256 } from '../cinco-de-bio-editor/languages/cinco-de-bio/src/protocol/sha256.ts';
import {
  branchLabelIssues,
  containmentSignature,
  normalizeIsList,
  portSignature,
  portsCompatible,
  stablePropertiesSignature,
  startNodeCountIsValid
} from '../cinco-de-bio-editor/languages/cinco-de-bio/src/helper/semantics.ts';

function nodeSha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

test('editor SHA-256 matches Node crypto around padding boundaries', () => {
  for (const length of [0, 1, 54, 55, 56, 63, 64, 119, 120]) {
    const value = 'a'.repeat(length);
    assert.equal(SHA256.hash(value), nodeSha256(value), `length ${length}`);
  }
});

test('port signatures and compatibility include list cardinality', () => {
  const scalar = { name: 'cells', typeName: 'CellSet', isList: false };
  const list = { name: 'cells', typeName: 'CellSet', isList: true };

  assert.notEqual(portSignature(scalar), portSignature(list));
  assert.equal(portsCompatible(scalar, list), false);
  assert.equal(portsCompatible({ typeName: 'CellSet', isList: 'true' }, list), true);
});

test('control-flow start-node cardinality requires exactly one start for non-empty workflows', () => {
  assert.equal(startNodeCountIsValid(0, 0), true);
  assert.equal(startNodeCountIsValid(3, 1), true);
  assert.equal(startNodeCountIsValid(3, 0), false);
  assert.equal(startNodeCountIsValid(3, 2), false);
});

test('branch label validation rejects invalid labels and duplicate branch use', () => {
  assert.deepEqual(branchLabelIssues([], ['']), { invalidLabels: [], duplicateLabels: [] });
  assert.deepEqual(branchLabelIssues([], ['success']), { invalidLabels: ['success'], duplicateLabels: [] });
  assert.deepEqual(branchLabelIssues(['success'], ['success', 'failure', 'success']), {
    invalidLabels: ['failure'],
    duplicateLabels: ['success']
  });
});

test('containment signatures distinguish input and output with identical properties', () => {
  const properties = { typeName: 'Image', name: 'image', isList: false };

  assert.notEqual(containmentSignature('input', properties), containmentSignature('output', properties));
  assert.equal(
    containmentSignature('input', { name: 'image', isList: false, typeName: 'Image' }),
    containmentSignature('input', { typeName: 'Image', name: 'image', isList: false })
  );
});

test('list normalization accepts only explicit true values', () => {
  assert.equal(normalizeIsList(true), true);
  assert.equal(normalizeIsList('true'), true);
  assert.equal(normalizeIsList(false), false);
  assert.equal(normalizeIsList('false'), false);
  assert.equal(normalizeIsList(undefined), false);
});

test('stable property signatures are key-order independent and tolerate undefined', () => {
  assert.equal(stablePropertiesSignature({ z: 1, a: 'x' }), stablePropertiesSignature({ a: 'x', z: 1 }));
  assert.equal(stablePropertiesSignature(undefined), '[]');
});