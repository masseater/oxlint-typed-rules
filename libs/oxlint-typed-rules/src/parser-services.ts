import { Option } from "effect";
import { SyntaxKind } from "typescript-7/ast";
import type { Node, SourceFile } from "typescript-7/ast";
import type { Context, Location, Range } from "vite-plus/lint/plugins";

import type { CompatProgram } from "./program.ts";

interface RangedNode {
  readonly range: Readonly<Range>;
}

interface MappedNode {
  readonly type: string;
  readonly range: Readonly<Range>;
  readonly loc: Location;
}

interface ParserServices {
  readonly program: CompatProgram;
  readonly esTreeNodeToTSNodeMap: { readonly get: (node: RangedNode) => Node };
  readonly tsNodeToESTreeNodeMap: {
    readonly get: (node: Node) => MappedNode | undefined;
  };
}

interface FileProgram {
  readonly context: Context;
  readonly program: CompatProgram;
  readonly sourceFile: SourceFile;
}

const covers = (node: Node, [start, end]: Readonly<Range>): boolean =>
  node.getStart() <= start && node.end >= end;

const spans = (node: Node, [start, end]: Readonly<Range>): boolean =>
  node.getStart() === start && node.end === end;

const innermostSpanning = (sourceFile: SourceFile, range: Readonly<Range>): Node => {
  const visit = (node: Node, found: Node): Node => {
    if (!covers(node, range)) {
      return found;
    }
    const matched = Option.liftPredicate(node, (candidate) => spans(candidate, range)).pipe(
      Option.getOrElse(() => found),
    );
    return Option.fromNullishOr(
      node.forEachChild((child) =>
        Option.liftPredicate(visit(child, matched), (deeper) => deeper !== matched).pipe(
          Option.getOrUndefined,
        ),
      ),
    ).pipe(Option.getOrElse(() => matched));
  };
  return visit(sourceFile, sourceFile);
};

const toMappedNode = ({ context }: FileProgram, node: Node): MappedNode => {
  const start = node.getStart();
  return {
    type: SyntaxKind[node.kind],
    range: [start, node.end],
    loc: {
      start: context.sourceCode.getLocFromIndex(start),
      end: context.sourceCode.getLocFromIndex(node.end),
    },
  };
};

const createParserServices = (file: FileProgram): ParserServices => {
  const toTs = new WeakMap<RangedNode, Node>();
  return {
    program: file.program,
    esTreeNodeToTSNodeMap: {
      get: (node) =>
        Option.fromNullishOr(toTs.get(node)).pipe(
          Option.getOrElse(() => {
            const found = innermostSpanning(file.sourceFile, node.range);
            toTs.set(node, found);
            return found;
          }),
        ),
    },
    tsNodeToESTreeNodeMap: {
      get: (node) =>
        Option.liftPredicate(
          node,
          (candidate) => candidate.getSourceFile().fileName === file.sourceFile.fileName,
        ).pipe(
          Option.map((candidate) => toMappedNode(file, candidate)),
          Option.getOrUndefined,
        ),
    },
  };
};

export { createParserServices };
export type { FileProgram, MappedNode, ParserServices, RangedNode };
