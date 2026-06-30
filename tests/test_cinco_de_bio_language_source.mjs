import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import test from 'node:test';

const languageRoot = resolve('cinco-de-bio-editor/languages/cinco-de-bio');
const srcRoot = resolve(languageRoot, 'src');
const runtimeHandlerDirs = new Set([
  'actions',
  'appearanceProviders',
  'generator',
  'hooks',
  'validation'
]);

function listTypeScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return listTypeScriptFiles(fullPath);
    }
    return entry.isFile() && entry.name.endsWith('.ts') ? [fullPath] : [];
  });
}

function readWorkspaceFile(path) {
  return readFileSync(path, 'utf8');
}

function relativeSourcePath(path) {
  return relative(srcRoot, path).replaceAll('\\', '/');
}

function sourceArea(path) {
  return relativeSourcePath(path).split('/')[0];
}

function stripLineComments(text) {
  return text
    .split('\n')
    .map(line => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

const sourceFiles = listTypeScriptFiles(srcRoot).sort();

function registeredClasses() {
  const registered = new Set();
  for (const file of sourceFiles) {
    const content = readWorkspaceFile(file);
    for (const match of content.matchAll(/LanguageFilesRegistry\.register\((\w+)\)/g)) {
      registered.add(match[1]);
    }
  }
  return registered;
}

test('every language source file is covered by source-level checks', () => {
  assert.ok(sourceFiles.length >= 30, `expected the language source tree to contain all implementation files, found ${sourceFiles.length}`);

  const uncovered = sourceFiles
    .map(relativeSourcePath)
    .filter(path => !runtimeHandlerDirs.has(path.split('/')[0]) && !path.startsWith('helper/') && !path.startsWith('protocol/'));

  assert.deepEqual(uncovered, []);
});

test('runtime handler files export and register their handler classes', () => {
  for (const file of sourceFiles.filter(path => runtimeHandlerDirs.has(sourceArea(path)))) {
    const relativePath = relativeSourcePath(file);
    const content = readWorkspaceFile(file);
    const classNames = [...content.matchAll(/export\s+class\s+(\w+)/g)].map(match => match[1]);

    assert.ok(classNames.length > 0, `${relativePath} should export a handler class`);
    for (const className of classNames) {
      assert.match(content, new RegExp(`LanguageFilesRegistry\\.register\\(${className}\\)`), `${relativePath} should register ${className}`);
    }
  }
});

test('helper and protocol files expose testable named exports', () => {
  for (const file of sourceFiles.filter(path => ['helper', 'protocol'].includes(sourceArea(path)))) {
    const relativePath = relativeSourcePath(file);
    const content = readWorkspaceFile(file);
    assert.match(
      content,
      /\bexport\s+(?:async\s+)?(?:function|const|enum|interface|type|class)\b/,
      `${relativePath} should expose named API for handlers or tests`
    );
  }
});

test('MGL annotations reference registered TypeScript handlers', () => {
  const annotationSources = [
    readWorkspaceFile(resolve(languageRoot, 'cincodebio.mgl')),
    readWorkspaceFile(resolve(languageRoot, 'siblibrary.mgl'))
  ].map(stripLineComments).join('\n');
  const annotatedHandlers = new Set(
    [...annotationSources.matchAll(/@(CustomAction|GeneratorAction|Validation|AppearanceProvider|Hook|DoubleClickAction)\(\s*["']?([A-Za-z_]\w*)/g)]
      .map(match => match[2])
  );
  const registered = registeredClasses();

  assert.ok(annotatedHandlers.size > 0, 'expected MGL files to contain handler annotations');
  for (const handlerName of annotatedHandlers) {
    assert.ok(registered.has(handlerName), `${handlerName} is annotated in MGL but not registered in src`);
  }
});

test('SIB library sync stores cacheable model files for prime references', () => {
  const values = readWorkspaceFile(resolve(srcRoot, 'protocol/values.ts'));
  const helper = readWorkspaceFile(resolve(srcRoot, 'helper/siblibrary_helper.ts'));
  const action = readWorkspaceFile(resolve(srcRoot, 'actions/SyncSibLibraryWithBackEnd.ts'));

  assert.match(values, /SIB_DIRECTORY_NAME:\s*string\s*=\s*"siblib\/"/);
  assert.match(values, /"\*\*\/siblib"\s*:\s*true/);
  assert.match(values, /"\*\*\/\.siblib"\s*:\s*true/);
  assert.match(helper, /ModelElementCache/);
  assert.match(helper, /cacheLocalSibLibraryModels/);
  assert.match(helper, /readModelFromFile/);
  assert.match(helper, /ModelElementCache\.cacheModel\(model\)/);
  assert.match(action, /cacheLocalSibLibraryModels\(this,\s*finalSibLibFiles\)/);
  assert.match(action, /RequestContextActions\.create/);
});

test('prime references align with the SIB library graph model', () => {
  const cinco = readWorkspaceFile(resolve(languageRoot, 'cincodebio.mgl'));
  const sibLibrary = readWorkspaceFile(resolve(languageRoot, 'siblibrary.mgl'));

  assert.match(cinco, /prime\s+siblib::Service\s+as\s+service/);
  assert.match(cinco, /prime\s+siblib::Task\s+as\s+task/);
  assert.match(sibLibrary, /graphModel\s+SIBLibrary/);
  assert.match(sibLibrary, /diagramExtension\s+"sibs"/);
  assert.match(sibLibrary, /container\s+Service\s+extends\s+SIBDef/);
  assert.match(sibLibrary, /container\s+Task\s+extends\s+SIBDef/);
});

test('SIB library output appearance provider uses the Output model type', () => {
  const content = readWorkspaceFile(resolve(srcRoot, 'appearanceProviders/SibLibOutputAppearanceProvider.ts'));

  assert.match(content, /import\s+\{\s*Output\s*\}\s+from\s+["']\.\.\/\.\.\/\.\.\/api\/siblibrary["']/);
  assert.doesNotMatch(content, /import\s+\{\s*Input\s*\}\s+from\s+["']\.\.\/\.\.\/\.\.\/api\/siblibrary["']/);
  assert.match(content, /element:\s*Output/);
});
