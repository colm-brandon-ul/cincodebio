# Cinco de Bio Editor based on Cinco Cloud

This project concerns the implementation of an editor for Cinco de Bio based on the Cinco Editor.
The project folder contains all the files necessary to execute the editor, generate, edit and execute Cinco de Bio models.

In addition to the files present in the original project repositories, an implementation of the Cinco de Bio language is given using the Meta-Style Language and Meta-Graph Language, that enable the implementation of visual modeling languages using Cinco Cloud.
Furthermore, a codec that generates XML files complying with the DAO-ML schema incorporating Cinco Cloud native properties is implemented and integrated with Cinco Cloud.

# How to Use

To use the editor, follow these simple steps to build and run the Docker container:

1. To compile the docker image, execute **from the root of the project**:

    `./build.sh`

2. To run the docker image, execute:

    `./run.sh`

    Ports `3000`, `3003`, and `5007` must be exposed. Port `3000` serves the Theia editor shell, port `3003` serves editor file assets, and port `5007` serves the GLSP diagram websocket used by `.flow` models.

The `env.list` file contains environment variables that will be used by the run script and can be customized as needed.

## Docker Configuration

The editor is built on the Cinco Cloud base image available at:

- `registry.gitlab.com/scce/cinco-projects/cinco-editor/cinco-editor:latest`

The Docker container mounts:

- `./workspace` at `/editor/workspace` for your workspace files
- `./languages` at `/editor/languages` for language definitions

At startup the editor cleans `/editor/workspace`, copies the versioned workspace template into it, and then copies the language definitions into `/editor/workspace/languages`. This keeps the upstream Cinco example languages out of the runtime workspace and makes repeated starts deterministic.

The startup script also passes `/editor/workspace` as an opened Theia workspace so project initialization and model creation can write files through the VS Code workspace API.

By default the editor connects to a local CincoDeBio backend through `http://host.docker.internal`.
Override this with `CINCODEBIO_API_BASE_URL` when the backend is exposed somewhere else.

## Testing

The repository-level Playwright tests can record editor flows:

- `npm run test:editor-model` creates and opens a new `.flow` model.
- `npm run test:editor-semantic-coverage` opens `semantic-coverage.flow` and records hooks, context menus, validation surfaces, and appearance-provider rendering.
- `npm run test:editor-refresh-sib-library` verifies the graph-level `Refresh SIB Library` action and records editor/SIB-manager logs.
- `npm run test:editor-recording` seeds `tests/fixtures/review-tma-workflow.flow` and records a full TMA workflow diagram. For the all-in-one container, run it with `CINCODEBIO_KUBECTL_COMMAND='docker exec -i cincodebio kubectl'`.

## Related projects and Used Technologies

[Cinco Editor][cc] -  for the complete Cinco Editor repository and licenses.

[Theia][theia] - We are using Theia as a foundation for our editor.

[Typescript][typescript] - Programming language.

[GLSP][glsp] - Our graphical editor is based on the GLSP project.

[Language Server Protocol][lsp] - A protocol for IDE agnostic programming language development.

[Langium][langium] - Textual meta-languages are provided using Langium.

[Sprotty][sprotty] - Used to visualize and edit graphical models.

[//]: # "Source definitions"
[cc]: https://gitlab.com/scce/cinco-projects/cinco-editor "Cinco Editor"
[theia]: https://github.com/eclipse-theia/theia "Theia"
[typescript]: https://www.typescriptlang.org/ "Typescript"
[glsp]: https://github.com/eclipse-glsp/glsp "The Graphical Language Server Platform"
[lsp]: https://microsoft.github.io/language-server-protocol/ "Language Server Protocol"
[langium]: https://langium.org/ "Langium"
[sprotty]: https://sprotty.org/ "Sprotty"

## Contributors

The development and integration of the project specific features, including the modeling language definitions in MGL and MSL and the codec for this project were conducted by Daniel Sami Mitwalli.
