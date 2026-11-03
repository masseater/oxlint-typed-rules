import {
  Array as Arr,
  Cause,
  Effect,
  Exit,
  Layer,
  ManagedRuntime,
  Option,
  String as Str,
  pipe,
} from "effect";
import { FetchHttpClient } from "effect/http";
import { OtlpSerialization, OtlpTracer } from "effect/observability";
import type { Node, SourceFile } from "typescript-7/ast";
import { createFileSystemLayer } from "typescript-7/fs";
import { API } from "typescript-7/sync";
import type {
  Checker,
  Program as NativeProgram,
  Project,
  Snapshot,
  Symbol as NativeSymbol,
  SymbolFlags,
} from "typescript-7/sync";

const tracing = OtlpTracer.layerFromConfig({
  resource: { serviceName: "oxlint-typed-rules" },
}).pipe(Layer.provide(OtlpSerialization.layerJson), Layer.provide(FetchHttpClient.layer));

const runtime = ManagedRuntime.make(tracing);

interface Overlay {
  readonly fileName: string;
  readonly text: string;
}

interface CompatSymbol {
  readonly native: NativeSymbol;
  readonly flags: SymbolFlags;
  readonly name: string;
  readonly getName: () => string;
  readonly getFlags: () => SymbolFlags;
  readonly getDeclarations: () => readonly Node[];
}

interface CompatChecker {
  readonly getSymbolAtLocation: (node: Node) => CompatSymbol | undefined;
  readonly getAliasedSymbol: (symbol: CompatSymbol) => CompatSymbol;
}

interface CompatProgram {
  readonly getSourceFile: (fileName: string) => SourceFile | undefined;
  readonly getSourceFiles: () => readonly SourceFile[];
  readonly getTypeChecker: () => CompatChecker;
}

const api = new API();

const snapshots = new Map<API, Snapshot>([[api, api.createSnapshot()]]);

const currentSnapshot = (): Snapshot =>
  Option.fromNullishOr(snapshots.get(api)).pipe(
    Option.getOrElse(() => {
      const created = api.createSnapshot();
      snapshots.set(api, created);
      return created;
    }),
  );

process.once("beforeExit", () => {
  api.close();
  Effect.runFork(runtime.disposeEffect);
});

const isOwnSourceFile = (fileName: string): boolean =>
  !Str.includes("/node_modules/")(fileName) && !Str.endsWith(".d.ts")(fileName);

const compatSymbols = new WeakMap<NativeSymbol, CompatSymbol>();

const toCompatSymbol = (project: Project, native: NativeSymbol): CompatSymbol =>
  Option.fromNullishOr(compatSymbols.get(native)).pipe(
    Option.getOrElse(() => {
      const created: CompatSymbol = {
        native,
        flags: native.flags,
        name: native.name,
        getName: () => native.name,
        getFlags: () => native.flags,
        getDeclarations: () =>
          pipe(
            native.declarations,
            Arr.flatMap((handle) =>
              Option.fromNullishOr(handle.resolve(project)).pipe(Option.toArray),
            ),
          ),
      };
      compatSymbols.set(native, created);
      return created;
    }),
  );

const compatChecker = (project: Project, checker: Checker): CompatChecker => ({
  getSymbolAtLocation: (node) =>
    Option.fromNullishOr(checker.getSymbolAtLocation(node)).pipe(
      Option.map((native) => toCompatSymbol(project, native)),
      Option.getOrUndefined,
    ),
  getAliasedSymbol: (symbol) => toCompatSymbol(project, checker.getAliasedSymbol(symbol.native)),
});

const ownSourceFiles = (program: NativeProgram): readonly SourceFile[] =>
  pipe(
    program.getSourceFileNames(),
    Arr.filter(isOwnSourceFile),
    Arr.flatMap((fileName) =>
      Option.fromNullishOr(program.getSourceFile(fileName)).pipe(Option.toArray),
    ),
  );

const compatPrograms = new WeakMap<NativeProgram, CompatProgram>();

const toCompatProgram = (project: Project): CompatProgram =>
  Option.fromNullishOr(compatPrograms.get(project.program)).pipe(
    Option.getOrElse(() => {
      const { program } = project;
      const checker = compatChecker(project, project.checker);
      const ownFiles: (readonly SourceFile[])[] = [];
      const created: CompatProgram = {
        getSourceFile: (fileName) => program.getSourceFile(fileName),
        getSourceFiles: () =>
          Arr.head(ownFiles).pipe(
            Option.getOrElse(() => {
              const files = ownSourceFiles(program);
              ownFiles.push(files);
              return files;
            }),
          ),
        getTypeChecker: () => checker,
      };
      compatPrograms.set(program, created);
      return created;
    }),
  );

const matchesText = (project: Project, overlay: Overlay): boolean =>
  Option.fromNullishOr(project.program.getSourceFile(overlay.fileName)).pipe(
    Option.exists((sourceFile) => sourceFile.text === overlay.text),
  );

const currentProject = (overlay: Overlay): Option.Option<Project> =>
  Option.fromNullishOr(currentSnapshot().getDefaultProjectForFile(overlay.fileName)).pipe(
    Option.filter((project) => matchesText(project, overlay)),
  );

const openFile = (overlay: Overlay): Effect.Effect<Option.Option<Project>> =>
  Effect.sync(() => {
    const updated = currentSnapshot().update({
      openFiles: [overlay.fileName],
      fileSystem: createFileSystemLayer([[overlay.fileName, overlay.text]]),
    });
    snapshots.set(api, updated);
    return Option.fromNullishOr(updated.getDefaultProjectForFile(overlay.fileName));
  }).pipe(
    Effect.withSpan("oxlint-typed-rules.open-file", {
      attributes: { fileName: overlay.fileName },
    }),
  );

const projectOfFile = (overlay: Overlay): Effect.Effect<Option.Option<Project>> =>
  Effect.suspend(() =>
    Option.match(currentProject(overlay), {
      onSome: Effect.succeedSome,
      onNone: () => openFile(overlay),
    }),
  );

const programFor = (overlay: Overlay): Option.Option<CompatProgram> =>
  Exit.match(runtime.runSyncExit(projectOfFile(overlay)), {
    onSuccess: Option.map(toCompatProgram),
    onFailure: (cause) => {
      throw Cause.squash(cause);
    },
  });

export type { CompatChecker, CompatProgram, CompatSymbol, Overlay };
export { programFor };
