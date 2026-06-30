import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';
import test from 'node:test';

const editorRoot = resolve('cinco-de-bio-editor');
const languageRoot = resolve(editorRoot, 'languages/cinco-de-bio');
const srcRoot = resolve(languageRoot, 'src');
const workspaceRoot = resolve(editorRoot, 'workspace');
const coveragePath = resolve(editorRoot, 'Test-Coverage.md');

const runtimeBases = new Set([
  'AppearanceProvider',
  'AbstractEdgeHook',
  'AbstractNodeHook',
  'CustomActionHandler',
  'DoubleClickHandler',
  'GeneratorHandler',
  'ValidationHandler'
]);

const runtimeCoverage = {
  SyncSibLibraryWithBackEnd: {
    examples: ['example.flow'],
    playwright: 'tests/editor_refresh_sib_library.spec.mjs',
    sourceChecks: [
      /cacheLocalSibLibraryModels\(this,\s*finalSibLibFiles\)/,
      /kind:\s*'requestContextActions'/,
      /readDirectory\(SIB_DIRECTORY_NAME\) \?\? \[\]/,
      /hideFolderInWorkspace\("\*\*\/" \+ SIB_DIRECTORY_NAME\.slice\(0, -1\)/
    ]
  },
  UpdateSIB: {
    examples: ['semantic-coverage.flow', 'sib-library-example.sibs'],
    playwright: 'tests/editor_semantic_coverage.spec.mjs',
    sourceChecks: [/primeReference\) as SIBDef \| undefined/, /Could not update SIB/, /DeleteElementOperation\.create/, /containmentSignature/, /layout\(sib\)/]
  },
  CincoDeBioGenerator: {
    examples: ['review-tma-workflow.flow'],
    playwright: 'tests/editor_semantic_coverage.spec.mjs',
    sourceChecks: [/validateSibLibrary\(this\)/, /remoteSubmitModel/, /Generation failed! Model Invalid/, /Generation successfull!/]
  },
  SIBHook: {
    examples: ['semantic-coverage.flow', 'sib-library-example.sibs'],
    playwright: 'tests/editor_semantic_coverage.spec.mjs',
    sourceChecks: [/primeReference\) as Service \| Task \| undefined/, /Could not initialize SIB/, /new InputPort\(\)/, /new OutputPort\(\)/, /new SIBLabel\(\)/, /validBranches/, /layout\(image\)/]
  },
  SIBDefHook: {
    examples: ['sib-library-example.sibs'],
    playwright: 'tests/editor_semantic_coverage.spec.mjs',
    sourceChecks: [/createSibDef\(sibDef\)/, /GraphModelWatcher\.addCallback/, /layout\(node as Container\)/]
  },
  NodeHook: {
    examples: ['sib-library-example.sibs'],
    playwright: 'tests/editor_semantic_coverage.spec.mjs',
    sourceChecks: [/Branch\.is\(node\)/, /Input\.is\(node\) \|\| Output\.is\(node\)/, /getRandomWord/, /layout\(node\.parent as Container\)/]
  },
  ControlFlowHook: {
    examples: ['semantic-coverage.flow', 'sib-library-example.sibs'],
    playwright: 'tests/editor_semantic_coverage.spec.mjs',
    sourceChecks: [/SIB\.is\(sourceSib\)/, /primeReference\) as Service \| Task \| undefined/, /Could not label ControlFlow/, /!edge\.label && branches\.length != 0/]
  },
  DataFlowHook: {
    examples: ['semantic-coverage.flow'],
    playwright: 'tests/editor_semantic_coverage.spec.mjs',
    sourceChecks: [/override postCreate\(edge: Edge\): void/, /LanguageFilesRegistry\.register\(DataFlowHook\)/]
  },
  GenericSibHook: {
    examples: ['semantic-coverage.flow'],
    playwright: 'tests/editor_semantic_coverage.spec.mjs',
    sourceChecks: [/graphModel\?\.id \?\? this\.modelState\.root\.id/, /findElement\(modelElementId\) as ModelElement \| undefined/, /this\.dialog\(`\$\{element\.label\} Documentation`/]
  },
  SibCheck: {
    examples: ['semantic-coverage.flow', 'sib-library-example.sibs'],
    playwright: 'tests/editor_semantic_coverage.spec.mjs',
    sourceChecks: [/validatePrime\(node: SIB, ref: SIBDef\)/, /No longer exists in the SIB library/, /Missing dataflow edge/, /portSignature/]
  },
  DataFlowCheck: {
    examples: ['semantic-coverage.flow'],
    playwright: 'tests/editor_semantic_coverage.spec.mjs',
    sourceChecks: [/getAllPaths\(sib, true\)/, /portsCompatible\(op, ip\)/, /does not occur before or is on another branch/]
  },
  ControlFlowCheck: {
    examples: ['semantic-coverage.flow'],
    playwright: 'tests/editor_semantic_coverage.spec.mjs',
    sourceChecks: [/hasAnyCycle\(sibs\)/, /startNodeCountIsValid/, /validateBranchLabels\(sibs\)/]
  },
  SibAppearanceProvider: {
    examples: ['semantic-coverage.flow'],
    playwright: 'tests/editor_semantic_coverage.spec.mjs',
    sourceChecks: [/return element\.view/]
  },
  SibLabelAppearanceProvider: {
    examples: ['semantic-coverage.flow'],
    playwright: 'tests/editor_semantic_coverage.spec.mjs',
    sourceChecks: [/sibLabel\.label = sib\.label/, /icons\/service\.png/, /icons\/task\.png/, /return sibLabel\.view/]
  },
  InputAppearanceProvider: {
    examples: ['semantic-coverage.flow'],
    playwright: 'tests/editor_semantic_coverage.spec.mjs',
    sourceChecks: [/primeReference\) as SIBDef \| undefined/, /sibDef\?\.properties/, /Object\.assign\(labelNode\.properties, sibDef\.properties\)/]
  },
  OutputAppearanceProvider: {
    examples: ['semantic-coverage.flow'],
    playwright: 'tests/editor_semantic_coverage.spec.mjs',
    sourceChecks: [/return element\.view/]
  },
  SIBDefAppearanceProvider: {
    examples: ['sib-library-example.sibs'],
    playwright: 'tests/editor_semantic_coverage.spec.mjs',
    sourceChecks: [/return sibDef\.view/]
  },
  ServiceAppearanceProvider: {
    examples: ['sib-library-example.sibs'],
    playwright: 'tests/editor_semantic_coverage.spec.mjs',
    sourceChecks: [/return element\.view/]
  },
  SibLibLabelAppearanceProvider: {
    examples: ['sib-library-example.sibs'],
    playwright: 'tests/editor_semantic_coverage.spec.mjs',
    sourceChecks: [/label\.name = sibDef\.name/, /label\.label = sibDef\.label/, /return label\.view/]
  },
  SibLibInputAppearanceProvider: {
    examples: ['sib-library-example.sibs'],
    playwright: 'tests/editor_semantic_coverage.spec.mjs',
    sourceChecks: [/return element\.view/]
  },
  SibLibOutputAppearanceProvider: {
    examples: ['sib-library-example.sibs'],
    playwright: 'tests/editor_semantic_coverage.spec.mjs',
    sourceChecks: [/import\s+\{\s*Output\s*\}/, /return element\.view/]
  }
};

function listFiles(directory, suffix) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return listFiles(fullPath, suffix);
    }
    return entry.isFile() && entry.name.endsWith(suffix) ? [fullPath] : [];
  });
}

function read(path) {
  return readFileSync(path, 'utf8');
}

function parseJsonFile(path) {
  return JSON.parse(read(path));
}

function relativeSourcePath(path) {
  return relative(srcRoot, path).replaceAll('\\', '/');
}

function runtimeClasses() {
  return listFiles(srcRoot, '.ts').flatMap(path => {
    const content = read(path);
    return [...content.matchAll(/export\s+class\s+(\w+)\s+extends\s+(\w+)/g)]
      .filter(([, , baseClass]) => runtimeBases.has(baseClass))
      .map(([, className, baseClass]) => ({ className, baseClass, path, relativePath: relativeSourcePath(path), content }));
  }).sort((left, right) => left.className.localeCompare(right.className));
}

test('every Cinco runtime class has source, example, coverage, and Playwright proof mapping', () => {
  const coverageMarkdown = read(coveragePath);
  const classes = runtimeClasses();
  assert.ok(classes.length >= 20, `expected the language to expose runtime classes, found ${classes.length}`);

  const missingCoverage = classes
    .map(({ className }) => className)
    .filter(className => !runtimeCoverage[className]);
  assert.deepEqual(missingCoverage, []);

  for (const runtimeClass of classes) {
    const coverage = runtimeCoverage[runtimeClass.className];
    assert.match(runtimeClass.content, new RegExp(`LanguageFilesRegistry\\.register\\(${runtimeClass.className}\\)`), `${runtimeClass.relativePath} should register ${runtimeClass.className}`);
    assert.ok(coverageMarkdown.includes(`\`${runtimeClass.className}\``), `Test-Coverage.md should document ${runtimeClass.className}`);
    for (const example of coverage.examples) {
      assert.ok(existsSync(resolve(workspaceRoot, example)), `${runtimeClass.className} should have example ${example}`);
    }
    assert.ok(existsSync(resolve(coverage.playwright)), `${runtimeClass.className} should have Playwright proof ${coverage.playwright}`);
    for (const pattern of coverage.sourceChecks) {
      assert.match(runtimeClass.content, pattern, `${runtimeClass.className} source contract failed: ${pattern}`);
    }
  }
});

test('workspace template contains realistic and semantic example models', () => {
  const example = parseJsonFile(resolve(workspaceRoot, 'example.flow'));
  const semantic = parseJsonFile(resolve(workspaceRoot, 'semantic-coverage.flow'));
  const tma = parseJsonFile(resolve(workspaceRoot, 'review-tma-workflow.flow'));
  const sibLibrary = parseJsonFile(resolve(workspaceRoot, 'sib-library-example.sibs'));

  for (const model of [example, semantic, tma]) {
    assert.equal(model.type, 'cincodebio:cincodebiographmodel', `${model.id} should be a CincoDeBio flow graph`);
    assert.ok(model._containments.some(element => element.type === 'cincodebio:automatedsib'), `${model.id} should include an automated SIB`);
    assert.ok(model._containments.some(element => element.type === 'cincodebio:interactivesib'), `${model.id} should include an interactive SIB`);
    assert.ok(model._edges.some(edge => edge.type === 'cincodebio:controlflow'), `${model.id} should include ControlFlow`);
    assert.ok(model._edges.some(edge => edge.type === 'cincodebio:dataflow'), `${model.id} should include DataFlow`);
  }

  assert.ok(tma._containments.length >= 7, 'review-tma-workflow.flow should remain the sophisticated installed-catalogue multi-SIB example');
  assert.ok(tma._edges.length >= 19, 'review-tma-workflow.flow should include realistic control/data-flow edges');
  assert.equal(sibLibrary.type, 'siblibrary:siblibrary');
  assert.ok(sibLibrary._containments.some(element => element.type === 'siblibrary:service'), 'SIB example should include services');
  assert.ok(sibLibrary._containments.some(element => element.type === 'siblibrary:task'), 'SIB example should include tasks');

  const libraryIds = new Set(sibLibrary._containments.map(element => element.id));
  const missingPrimeRefs = semantic._containments
    .map(element => element._primeReference?.instanceId)
    .filter(Boolean)
    .filter(instanceId => !libraryIds.has(instanceId));
  assert.deepEqual(missingPrimeRefs, []);
});

test('MGL annotations, example models, and runtime classes stay aligned', () => {
  const annotations = [read(resolve(languageRoot, 'cincodebio.mgl')), read(resolve(languageRoot, 'siblibrary.mgl'))].join('\n');
  const classNames = new Set(runtimeClasses().map(entry => entry.className));
  const annotated = [...annotations.matchAll(/@(CustomAction|GeneratorAction|Validation|AppearanceProvider|Hook|DoubleClickAction)\(\s*["']?([A-Za-z_]\w*)/g)].map(match => match[2]);

  for (const handler of annotated) {
    assert.ok(classNames.has(handler), `${handler} is annotated in MGL but not implemented as a registered runtime class`);
  }

  const semantic = read(resolve(workspaceRoot, 'semantic-coverage.flow'));
  for (const expectedType of ['cincodebio:interactivesib', 'cincodebio:automatedsib', 'cincodebio:siblabel', 'cincodebio:inputport', 'cincodebio:outputport', 'cincodebio:controlflow', 'cincodebio:dataflow']) {
    assert.ok(semantic.includes(expectedType), `semantic-coverage.flow should exercise ${expectedType}`);
  }
});

test('coverage document lists generated proof artifacts for every Playwright test', () => {
  const coverageMarkdown = read(coveragePath);
  for (const artifact of [
    'artifacts/playwright/editor-model-reviewdemo.webm',
    'artifacts/playwright/editor-model-reviewdemo-trace.zip',
    'artifacts/playwright/editor-refresh-sib-library.webm',
    'artifacts/playwright/editor-refresh-sib-library-trace.zip',
    'artifacts/playwright/editor-tma-workflow-step-by-step.webm',
    'artifacts/playwright/editor-tma-workflow-trace.zip',
    'artifacts/playwright/editor-semantic-coverage.webm',
    'artifacts/playwright/editor-semantic-coverage-trace.zip'
  ]) {
    assert.ok(coverageMarkdown.includes(artifact), `Test-Coverage.md should list ${artifact}`);
  }
});

test('every workspace model has a matching documented role', () => {
  const readme = read(resolve(workspaceRoot, 'README.md'));
  const modelFiles = readdirSync(workspaceRoot).filter(name => /\.(flow|sibs)$/.test(name)).sort();
  assert.deepEqual(modelFiles, ['example.flow', 'review-tma-workflow.flow', 'semantic-coverage.flow', 'sib-library-example.sibs']);
  for (const modelFile of modelFiles) {
    assert.ok(readme.includes(modelFile), `${basename(modelFile)} should be documented in workspace README`);
  }
});
