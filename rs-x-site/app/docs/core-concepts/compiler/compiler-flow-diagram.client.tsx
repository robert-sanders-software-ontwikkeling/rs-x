'use client';

import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type NodeShape = 'rect' | 'diamond';
type NodeTone = 'neutral' | 'build' | 'runtime';
type DiagramKind = 'build' | 'runtime';

type FlowNode = {
  id: string;
  label: string;
  shape: NodeShape;
  tone?: NodeTone;
};

type FlowEdge = {
  from: string;
  to: string;
  label?: string;
};

type DiagramDefinition = {
  title: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

type PositionedNode = FlowNode & {
  x: number;
  y: number;
  width: number;
  height: number;
  rank: number;
  visualRow: number;
};

type RoutedEdge = FlowEdge & {
  path: string;
  labelX: number;
  labelY: number;
};

const PADDING_X = 24;
const PADDING_Y = 22;
const H_GAP = 34;
const V_GAP = 56;
const RECT_HEIGHT = 64;
const DIAMOND_HEIGHT = 72;
const MIN_NODE_WIDTH = 220;
const MAX_NODE_WIDTH = 340;

const BUILD: DiagramDefinition = {
  title: 'Build Flow',
  nodes: [
    {
      id: 'scan',
      label: 'Find expression declarations',
      shape: 'rect',
      tone: 'build',
    },
    {
      id: 'validate',
      label: 'Validate expression',
      shape: 'rect',
      tone: 'build',
    },
    { id: 'valid', label: 'Valid?', shape: 'diamond', tone: 'build' },
    {
      id: 'diagnostics',
      label: 'Emit diagnostics / fail',
      shape: 'rect',
      tone: 'neutral',
    },
    {
      id: 'effective',
      label: 'Resolve effective options',
      shape: 'rect',
      tone: 'build',
    },
    {
      id: 'preparse',
      label: 'Preparse enabled?',
      shape: 'diamond',
      tone: 'build',
    },
    {
      id: 'emitPreparse',
      label: 'Generate preparsed cache entry',
      shape: 'rect',
      tone: 'build',
    },
    {
      id: 'skipPreparse',
      label: 'Skip preparse output',
      shape: 'rect',
      tone: 'neutral',
    },
    {
      id: 'compiled',
      label: 'Compiled enabled for site?',
      shape: 'diamond',
      tone: 'build',
    },
    {
      id: 'emitCompiled',
      label: 'Generate compiled plan',
      shape: 'rect',
      tone: 'build',
    },
    {
      id: 'skipCompiled',
      label: 'Skip compiled output',
      shape: 'rect',
      tone: 'neutral',
    },
    { id: 'lazy', label: 'Lazy enabled?', shape: 'diamond', tone: 'build' },
    {
      id: 'emitLazy',
      label: 'Generate lazy manifest / preload',
      shape: 'rect',
      tone: 'build',
    },
    {
      id: 'skipLazy',
      label: 'No lazy manifest entry',
      shape: 'rect',
      tone: 'neutral',
    },
  ],
  edges: [
    { from: 'scan', to: 'validate' },
    { from: 'validate', to: 'valid' },
    { from: 'valid', to: 'effective', label: 'Yes' },
    { from: 'valid', to: 'diagnostics', label: 'No' },
    { from: 'effective', to: 'preparse' },
    { from: 'preparse', to: 'emitPreparse', label: 'Yes' },
    { from: 'preparse', to: 'skipPreparse', label: 'No' },
    { from: 'emitPreparse', to: 'compiled' },
    { from: 'skipPreparse', to: 'skipLazy' },
    { from: 'compiled', to: 'emitCompiled', label: 'Yes' },
    { from: 'compiled', to: 'skipCompiled', label: 'No' },
    { from: 'emitCompiled', to: 'lazy' },
    { from: 'skipCompiled', to: 'lazy' },
    { from: 'lazy', to: 'emitLazy', label: 'Yes' },
    { from: 'lazy', to: 'skipLazy', label: 'No' },
  ],
};

const RUNTIME: DiagramDefinition = {
  title: 'Runtime Flow',
  nodes: [
    {
      id: 'create',
      label: 'create/bind request',
      shape: 'rect',
      tone: 'runtime',
    },
    { id: 'lazy', label: 'lazy preloader?', shape: 'diamond', tone: 'runtime' },
    {
      id: 'loadLazy',
      label: 'Load lazy entry (first use)',
      shape: 'rect',
      tone: 'runtime',
    },
    {
      id: 'skipLazyLoad',
      label: 'Skip lazy load',
      shape: 'rect',
      tone: 'neutral',
    },
    {
      id: 'compiled',
      label: 'compiled plan in cache?',
      shape: 'diamond',
      tone: 'runtime',
    },
    {
      id: 'useCompiled',
      label: 'Use compiled evaluator',
      shape: 'rect',
      tone: 'runtime',
    },
    {
      id: 'preparsed',
      label: 'preparsed AST in cache?',
      shape: 'diamond',
      tone: 'runtime',
    },
    {
      id: 'clonePreparse',
      label: 'Clone preparsed AST',
      shape: 'rect',
      tone: 'runtime',
    },
    {
      id: 'parse',
      label: 'Parse expression at runtime',
      shape: 'rect',
      tone: 'neutral',
    },
    {
      id: 'bind',
      label: 'Bind watches + evaluate',
      shape: 'rect',
      tone: 'runtime',
    },
  ],
  edges: [
    { from: 'create', to: 'lazy' },
    { from: 'lazy', to: 'loadLazy', label: 'Yes' },
    { from: 'lazy', to: 'skipLazyLoad', label: 'No' },
    { from: 'loadLazy', to: 'compiled' },
    { from: 'skipLazyLoad', to: 'compiled' },
    { from: 'compiled', to: 'useCompiled', label: 'Yes' },
    { from: 'compiled', to: 'preparsed', label: 'No' },
    { from: 'preparsed', to: 'clonePreparse', label: 'Yes' },
    { from: 'preparsed', to: 'parse', label: 'No' },
    { from: 'useCompiled', to: 'bind' },
    { from: 'clonePreparse', to: 'bind' },
    { from: 'parse', to: 'bind' },
  ],
};

function nodeHeight(shape: NodeShape): number {
  return shape === 'diamond' ? DIAMOND_HEIGHT : RECT_HEIGHT;
}

type Anchor = 'top' | 'right' | 'bottom' | 'left';

function anchorPoint(
  node: PositionedNode,
  anchor: Anchor,
): { x: number; y: number } {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  if (anchor === 'top') {
    return { x: cx, y: node.y };
  }
  if (anchor === 'right') {
    return { x: node.x + node.width, y: cy };
  }
  if (anchor === 'bottom') {
    return { x: cx, y: node.y + node.height };
  }
  return { x: node.x, y: cy };
}

function orthPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) {
    return '';
  }
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  return path;
}

function splitLabel(label: string, width: number): string[] {
  const maxChars = Math.max(10, Math.floor((width - 36) / 8));
  if (label.length <= maxChars) {
    return [label];
  }

  const words = label.split(' ');
  const lines: string[] = [];
  let current = '';
  for (let i = 0; i < words.length; i++) {
    const next = current.length === 0 ? words[i] : `${current} ${words[i]}`;
    if (next.length > maxChars && current.length > 0) {
      lines.push(current);
      current = words[i];
    } else {
      current = next;
    }
  }
  if (current.length > 0) {
    lines.push(current);
  }
  return lines.slice(0, 3);
}

function buildTopology(definition: DiagramDefinition) {
  const nodeIndex = new Map<string, number>();
  const indegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  for (let i = 0; i < definition.nodes.length; i++) {
    const id = definition.nodes[i].id;
    nodeIndex.set(id, i);
    indegree.set(id, 0);
    outgoing.set(id, []);
    incoming.set(id, []);
  }

  for (let i = 0; i < definition.edges.length; i++) {
    const edge = definition.edges[i];
    outgoing.get(edge.from)?.push(edge.to);
    incoming.get(edge.to)?.push(edge.from);
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const node of definition.nodes) {
    if ((indegree.get(node.id) ?? 0) === 0) {
      queue.push(node.id);
    }
  }
  queue.sort((a, b) => (nodeIndex.get(a) ?? 0) - (nodeIndex.get(b) ?? 0));

  const topo: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    topo.push(id);
    const out = outgoing.get(id) ?? [];
    for (let i = 0; i < out.length; i++) {
      const next = out[i];
      const deg = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, deg);
      if (deg === 0) {
        queue.push(next);
      }
    }
    queue.sort((a, b) => (nodeIndex.get(a) ?? 0) - (nodeIndex.get(b) ?? 0));
  }

  if (topo.length !== definition.nodes.length) {
    return {
      topo: definition.nodes.map((n) => n.id),
      outgoing,
      incoming,
      nodeIndex,
    };
  }

  return { topo, outgoing, incoming, nodeIndex };
}

function chooseColumns(innerWidth: number): {
  cols: number;
  nodeWidth: number;
} {
  const rawMaxCols = Math.max(
    1,
    Math.floor((innerWidth + H_GAP) / (MIN_NODE_WIDTH + H_GAP)),
  );
  const maxCols = Math.min(3, rawMaxCols);

  for (let cols = maxCols; cols >= 1; cols--) {
    const rawWidth = (innerWidth - (cols - 1) * H_GAP) / cols;
    if (rawWidth >= MIN_NODE_WIDTH) {
      return {
        cols,
        nodeWidth: Math.min(MAX_NODE_WIDTH, Math.max(MIN_NODE_WIDTH, rawWidth)),
      };
    }
  }

  return {
    cols: 1,
    nodeWidth: Math.min(MAX_NODE_WIDTH, Math.max(MIN_NODE_WIDTH, innerWidth)),
  };
}

function layoutRuntimeDiagram(definition: DiagramDefinition, width: number) {
  const safeWidth = Math.max(width, 420);
  if (safeWidth < 980) {
    return undefined;
  }

  const innerWidth = safeWidth - PADDING_X * 2;
  const nodeWidth = Math.min(
    MAX_NODE_WIDTH,
    Math.max(250, Math.floor((innerWidth - 2 * H_GAP) / 3)),
  );
  const totalGridWidth = nodeWidth * 3 + H_GAP * 2;
  const gridStartX = PADDING_X + (innerWidth - totalGridWidth) / 2;
  const leftX = gridStartX;
  const centerX = gridStartX + nodeWidth + H_GAP;
  const rightX = gridStartX + (nodeWidth + H_GAP) * 2;
  const y0 = PADDING_Y;
  const y1 = y0 + 110;
  const y2 = y1 + 130;
  const y3 = y2 + 130;
  const y4 = y3 + 130;
  const y5 = y4 + 130;
  const y6 = y5 + 130;

  const byId = new Map<string, PositionedNode>();
  const setNode = (id: string, x: number, y: number) => {
    const base = definition.nodes.find((n) => n.id === id);
    if (!base) {
      return;
    }
    const height = nodeHeight(base.shape);
    byId.set(id, {
      ...base,
      x,
      y,
      width: nodeWidth,
      height,
      rank: 0,
      visualRow: 0,
    });
  };

  setNode('create', centerX, y0);
  setNode('lazy', centerX, y1);
  setNode('loadLazy', leftX, y2);
  setNode('skipLazyLoad', rightX, y2);
  setNode('compiled', centerX, y3);
  setNode('useCompiled', leftX, y4);
  setNode('preparsed', rightX, y4);
  setNode('clonePreparse', rightX, y5);
  setNode('parse', centerX, y5);
  setNode('bind', centerX, y6);

  const must = (id: string): PositionedNode => byId.get(id) as PositionedNode;
  const lazy = must('lazy');
  const loadLazy = must('loadLazy');
  const skipLazy = must('skipLazyLoad');
  const compiled = must('compiled');
  const useCompiled = must('useCompiled');
  const preparsed = must('preparsed');
  const clone = must('clonePreparse');
  const parse = must('parse');
  const bind = must('bind');

  const splitLazyY = anchorPoint(lazy, 'bottom').y + 20;
  const splitCompiledY = anchorPoint(compiled, 'bottom').y + 20;
  const splitPreparsedY = anchorPoint(preparsed, 'bottom').y + 20;
  const splitLazyYesY = splitLazyY;
  const splitLazyNoY = splitLazyY;
  const splitCompiledYesY = splitCompiledY;
  const splitCompiledNoY = splitCompiledY;
  const splitPreparsedYesY = splitPreparsedY;
  const splitPreparsedNoY = splitPreparsedY;
  const routed: RoutedEdge[] = [];
  const add = (
    edge: FlowEdge,
    points: Array<{ x: number; y: number }>,
    lx: number,
    ly: number,
  ) => {
    routed.push({ ...edge, path: orthPath(points), labelX: lx, labelY: ly });
  };

  const create = must('create');
  add(
    { from: 'create', to: 'lazy' },
    [anchorPoint(create, 'bottom'), anchorPoint(lazy, 'top')],
    0,
    0,
  );

  add(
    { from: 'lazy', to: 'loadLazy', label: 'Yes' },
    [
      anchorPoint(lazy, 'bottom'),
      { x: anchorPoint(lazy, 'bottom').x, y: splitLazyYesY },
      { x: anchorPoint(loadLazy, 'top').x, y: splitLazyYesY },
      anchorPoint(loadLazy, 'top'),
    ],
    anchorPoint(loadLazy, 'top').x - 26,
    splitLazyYesY - 10,
  );

  add(
    { from: 'lazy', to: 'skipLazyLoad', label: 'No' },
    [
      anchorPoint(lazy, 'bottom'),
      { x: anchorPoint(lazy, 'bottom').x, y: splitLazyNoY },
      { x: anchorPoint(skipLazy, 'top').x, y: splitLazyNoY },
      anchorPoint(skipLazy, 'top'),
    ],
    anchorPoint(skipLazy, 'top').x + 24,
    splitLazyNoY - 10,
  );

  add(
    { from: 'loadLazy', to: 'compiled' },
    [
      anchorPoint(loadLazy, 'bottom'),
      {
        x: anchorPoint(loadLazy, 'bottom').x,
        y: anchorPoint(compiled, 'left').y,
      },
      anchorPoint(compiled, 'left'),
    ],
    0,
    0,
  );

  add(
    { from: 'skipLazyLoad', to: 'compiled' },
    [
      anchorPoint(skipLazy, 'bottom'),
      {
        x: anchorPoint(skipLazy, 'bottom').x,
        y: anchorPoint(compiled, 'right').y,
      },
      anchorPoint(compiled, 'right'),
    ],
    0,
    0,
  );

  add(
    { from: 'compiled', to: 'useCompiled', label: 'Yes' },
    [
      anchorPoint(compiled, 'bottom'),
      { x: anchorPoint(compiled, 'bottom').x, y: splitCompiledYesY },
      { x: anchorPoint(useCompiled, 'top').x, y: splitCompiledYesY },
      anchorPoint(useCompiled, 'top'),
    ],
    anchorPoint(useCompiled, 'top').x - 26,
    splitCompiledYesY - 10,
  );

  add(
    { from: 'compiled', to: 'preparsed', label: 'No' },
    [
      anchorPoint(compiled, 'bottom'),
      { x: anchorPoint(compiled, 'bottom').x, y: splitCompiledNoY },
      { x: anchorPoint(preparsed, 'top').x, y: splitCompiledNoY },
      anchorPoint(preparsed, 'top'),
    ],
    anchorPoint(preparsed, 'top').x + 22,
    splitCompiledNoY - 10,
  );

  add(
    { from: 'useCompiled', to: 'bind' },
    [
      anchorPoint(useCompiled, 'bottom'),
      {
        x: anchorPoint(useCompiled, 'bottom').x,
        y: anchorPoint(bind, 'left').y,
      },
      anchorPoint(bind, 'left'),
    ],
    0,
    0,
  );

  add(
    { from: 'preparsed', to: 'clonePreparse', label: 'Yes' },
    [
      anchorPoint(preparsed, 'bottom'),
      { x: anchorPoint(preparsed, 'bottom').x, y: splitPreparsedYesY },
      { x: anchorPoint(clone, 'top').x, y: splitPreparsedYesY },
      anchorPoint(clone, 'top'),
    ],
    anchorPoint(clone, 'top').x + 24,
    (splitPreparsedYesY + anchorPoint(clone, 'top').y) / 2,
  );

  add(
    { from: 'preparsed', to: 'parse', label: 'No' },
    [
      anchorPoint(preparsed, 'bottom'),
      { x: anchorPoint(preparsed, 'bottom').x, y: splitPreparsedNoY },
      { x: anchorPoint(parse, 'top').x, y: splitPreparsedNoY },
      anchorPoint(parse, 'top'),
    ],
    anchorPoint(parse, 'top').x + 22,
    splitPreparsedNoY - 10,
  );

  add(
    { from: 'clonePreparse', to: 'bind' },
    [
      anchorPoint(clone, 'bottom'),
      { x: anchorPoint(clone, 'bottom').x, y: anchorPoint(bind, 'right').y },
      anchorPoint(bind, 'right'),
    ],
    0,
    0,
  );

  add(
    { from: 'parse', to: 'bind' },
    [anchorPoint(parse, 'bottom'), anchorPoint(bind, 'top')],
    0,
    0,
  );

  const nodes = Array.from(byId.values());
  const maxY = Math.max(...nodes.map((n) => n.y + n.height), 0);

  return {
    width: safeWidth,
    height: maxY + PADDING_Y,
    nodes,
    edges: routed,
  };
}

function layoutBuildDiagram(definition: DiagramDefinition, width: number) {
  const safeWidth = Math.max(width, 420);
  if (safeWidth < 980) {
    return undefined;
  }

  const innerWidth = safeWidth - PADDING_X * 2;
  const nodeWidth = Math.min(
    MAX_NODE_WIDTH,
    Math.max(250, Math.floor((innerWidth - 2 * H_GAP) / 3)),
  );
  const centerX = PADDING_X + innerWidth / 2 - nodeWidth / 2;
  const leftX = PADDING_X + innerWidth * 0.22 - nodeWidth / 2;
  const rightX = PADDING_X + innerWidth * 0.78 - nodeWidth / 2;
  const y0 = PADDING_Y;
  const y1 = y0 + 110;
  const y2 = y1 + 130;
  const y3 = y2 + 130;
  const y4 = y3 + 130;
  const y5 = y4 + 130;
  const y6 = y5 + 130;
  const y7 = y6 + 130;
  const y8 = y7 + 130;
  const y9 = y8 + 130;

  const byId = new Map<string, PositionedNode>();
  const setNode = (id: string, x: number, y: number) => {
    const base = definition.nodes.find((n) => n.id === id);
    if (!base) {
      return;
    }
    const height = nodeHeight(base.shape);
    byId.set(id, {
      ...base,
      x,
      y,
      width: nodeWidth,
      height,
      rank: 0,
      visualRow: 0,
    });
  };

  setNode('scan', centerX, y0);
  setNode('validate', centerX, y1);
  setNode('valid', centerX, y2);
  setNode('effective', leftX, y3);
  setNode('diagnostics', rightX, y3);
  setNode('preparse', centerX, y4);
  setNode('emitPreparse', leftX, y5);
  setNode('skipPreparse', rightX, y5);
  setNode('compiled', centerX, y6);
  setNode('emitCompiled', leftX, y7);
  setNode('skipCompiled', rightX, y7);
  setNode('lazy', centerX, y8);
  setNode('emitLazy', leftX, y9);
  setNode('skipLazy', rightX, y9);

  const must = (id: string): PositionedNode => byId.get(id) as PositionedNode;
  const scan = must('scan');
  const validate = must('validate');
  const valid = must('valid');
  const effective = must('effective');
  const diagnostics = must('diagnostics');
  const preparse = must('preparse');
  const emitPreparse = must('emitPreparse');
  const skipPreparse = must('skipPreparse');
  const compiled = must('compiled');
  const emitCompiled = must('emitCompiled');
  const skipCompiled = must('skipCompiled');
  const lazy = must('lazy');
  const emitLazy = must('emitLazy');
  const skipLazyNode = must('skipLazy');

  const splitValidY = anchorPoint(valid, 'bottom').y + 20;
  const splitPreparseY = anchorPoint(preparse, 'bottom').y + 20;
  const splitCompiledY = anchorPoint(compiled, 'bottom').y + 20;
  const splitLazyY = anchorPoint(lazy, 'bottom').y + 20;

  const splitValidYesY = splitValidY;
  const splitValidNoY = splitValidY;
  const splitPreparseYesY = splitPreparseY;
  const splitPreparseNoY = splitPreparseY;
  const splitCompiledYesY = splitCompiledY;
  const splitCompiledNoY = splitCompiledY;
  const splitLazyYesY = splitLazyY;
  const splitLazyNoY = splitLazyY;

  const routed: RoutedEdge[] = [];
  const add = (
    edge: FlowEdge,
    points: Array<{ x: number; y: number }>,
    lx: number,
    ly: number,
  ) => {
    routed.push({ ...edge, path: orthPath(points), labelX: lx, labelY: ly });
  };

  add(
    { from: 'scan', to: 'validate' },
    [anchorPoint(scan, 'bottom'), anchorPoint(validate, 'top')],
    0,
    0,
  );

  add(
    { from: 'validate', to: 'valid' },
    [anchorPoint(validate, 'bottom'), anchorPoint(valid, 'top')],
    0,
    0,
  );

  add(
    { from: 'valid', to: 'effective', label: 'Yes' },
    [
      anchorPoint(valid, 'bottom'),
      { x: anchorPoint(valid, 'bottom').x, y: splitValidYesY },
      { x: anchorPoint(effective, 'top').x, y: splitValidYesY },
      anchorPoint(effective, 'top'),
    ],
    anchorPoint(effective, 'top').x - 26,
    splitValidYesY - 10,
  );
  add(
    { from: 'valid', to: 'diagnostics', label: 'No' },
    [
      anchorPoint(valid, 'bottom'),
      { x: anchorPoint(valid, 'bottom').x, y: splitValidNoY },
      { x: anchorPoint(diagnostics, 'top').x, y: splitValidNoY },
      anchorPoint(diagnostics, 'top'),
    ],
    anchorPoint(diagnostics, 'top').x + 22,
    splitValidNoY - 10,
  );

  add(
    { from: 'effective', to: 'preparse' },
    [
      anchorPoint(effective, 'bottom'),
      {
        x: anchorPoint(effective, 'bottom').x,
        y: anchorPoint(preparse, 'left').y,
      },
      anchorPoint(preparse, 'left'),
    ],
    0,
    0,
  );

  add(
    { from: 'preparse', to: 'emitPreparse', label: 'Yes' },
    [
      anchorPoint(preparse, 'bottom'),
      { x: anchorPoint(preparse, 'bottom').x, y: splitPreparseYesY },
      { x: anchorPoint(emitPreparse, 'top').x, y: splitPreparseYesY },
      anchorPoint(emitPreparse, 'top'),
    ],
    anchorPoint(emitPreparse, 'top').x - 26,
    splitPreparseYesY - 10,
  );
  add(
    { from: 'preparse', to: 'skipPreparse', label: 'No' },
    [
      anchorPoint(preparse, 'bottom'),
      { x: anchorPoint(preparse, 'bottom').x, y: splitPreparseNoY },
      { x: anchorPoint(skipPreparse, 'top').x, y: splitPreparseNoY },
      anchorPoint(skipPreparse, 'top'),
    ],
    anchorPoint(skipPreparse, 'top').x + 22,
    splitPreparseNoY - 10,
  );

  add(
    { from: 'emitPreparse', to: 'compiled' },
    [
      anchorPoint(emitPreparse, 'right'),
      {
        x: anchorPoint(compiled, 'left').x - 18,
        y: anchorPoint(emitPreparse, 'right').y,
      },
      {
        x: anchorPoint(compiled, 'left').x - 18,
        y: anchorPoint(compiled, 'left').y,
      },
      anchorPoint(compiled, 'left'),
    ],
    0,
    0,
  );
  add(
    { from: 'skipPreparse', to: 'skipLazy' },
    [
      anchorPoint(skipPreparse, 'right'),
      {
        x: anchorPoint(skipLazyNode, 'right').x + 72,
        y: anchorPoint(skipPreparse, 'right').y,
      },
      {
        x: anchorPoint(skipLazyNode, 'right').x + 72,
        y: anchorPoint(skipLazyNode, 'right').y,
      },
      anchorPoint(skipLazyNode, 'right'),
    ],
    0,
    0,
  );

  add(
    { from: 'compiled', to: 'emitCompiled', label: 'Yes' },
    [
      anchorPoint(compiled, 'bottom'),
      { x: anchorPoint(compiled, 'bottom').x, y: splitCompiledYesY },
      { x: anchorPoint(emitCompiled, 'right').x + 16, y: splitCompiledYesY },
      {
        x: anchorPoint(emitCompiled, 'right').x + 16,
        y: anchorPoint(emitCompiled, 'right').y,
      },
      anchorPoint(emitCompiled, 'right'),
    ],
    (anchorPoint(compiled, 'bottom').x +
      (anchorPoint(emitCompiled, 'right').x + 16)) /
      2,
    splitCompiledYesY - 4,
  );
  add(
    { from: 'compiled', to: 'skipCompiled', label: 'No' },
    [
      anchorPoint(compiled, 'bottom'),
      { x: anchorPoint(compiled, 'bottom').x, y: splitCompiledNoY },
      { x: anchorPoint(skipCompiled, 'left').x - 16, y: splitCompiledNoY },
      {
        x: anchorPoint(skipCompiled, 'left').x - 16,
        y: anchorPoint(skipCompiled, 'left').y,
      },
      anchorPoint(skipCompiled, 'left'),
    ],
    (anchorPoint(compiled, 'bottom').x +
      (anchorPoint(skipCompiled, 'left').x - 16)) /
      2,
    splitCompiledNoY - 4,
  );

  add(
    { from: 'emitCompiled', to: 'lazy' },
    [
      anchorPoint(emitCompiled, 'right'),
      {
        x: anchorPoint(lazy, 'left').x - 18,
        y: anchorPoint(emitCompiled, 'right').y,
      },
      { x: anchorPoint(lazy, 'left').x - 18, y: anchorPoint(lazy, 'left').y },
      anchorPoint(lazy, 'left'),
    ],
    0,
    0,
  );
  add(
    { from: 'skipCompiled', to: 'lazy' },
    [
      anchorPoint(skipCompiled, 'right'),
      {
        x: anchorPoint(skipCompiled, 'right').x + 26,
        y: anchorPoint(skipCompiled, 'right').y,
      },
      {
        x: anchorPoint(skipCompiled, 'right').x + 26,
        y: anchorPoint(lazy, 'top').y - 18,
      },
      { x: anchorPoint(lazy, 'top').x, y: anchorPoint(lazy, 'top').y - 18 },
      anchorPoint(lazy, 'top'),
    ],
    0,
    0,
  );

  add(
    { from: 'lazy', to: 'emitLazy', label: 'Yes' },
    [
      anchorPoint(lazy, 'bottom'),
      { x: anchorPoint(lazy, 'bottom').x, y: splitLazyYesY },
      { x: anchorPoint(emitLazy, 'right').x + 16, y: splitLazyYesY },
      {
        x: anchorPoint(emitLazy, 'right').x + 16,
        y: anchorPoint(emitLazy, 'right').y,
      },
      anchorPoint(emitLazy, 'right'),
    ],
    (anchorPoint(lazy, 'bottom').x + (anchorPoint(emitLazy, 'right').x + 16)) /
      2,
    splitLazyYesY - 4,
  );
  add(
    { from: 'lazy', to: 'skipLazy', label: 'No' },
    [
      anchorPoint(lazy, 'bottom'),
      { x: anchorPoint(lazy, 'bottom').x, y: splitLazyNoY },
      { x: anchorPoint(skipLazyNode, 'left').x - 32, y: splitLazyNoY },
      {
        x: anchorPoint(skipLazyNode, 'left').x - 32,
        y: anchorPoint(skipLazyNode, 'left').y,
      },
      anchorPoint(skipLazyNode, 'left'),
    ],
    (anchorPoint(lazy, 'bottom').x +
      (anchorPoint(skipLazyNode, 'left').x - 16)) /
      2,
    splitLazyNoY - 4,
  );

  const nodes = Array.from(byId.values());
  const maxY = Math.max(...nodes.map((n) => n.y + n.height), 0);

  return {
    width: safeWidth,
    height: maxY + PADDING_Y,
    nodes,
    edges: routed,
  };
}

function layoutDiagram(definition: DiagramDefinition, width: number) {
  if (definition.title === 'Build Flow') {
    const buildLayout = layoutBuildDiagram(definition, width);
    if (buildLayout) {
      return buildLayout;
    }
  }
  if (definition.title === 'Runtime Flow') {
    const runtimeLayout = layoutRuntimeDiagram(definition, width);
    if (runtimeLayout) {
      return runtimeLayout;
    }
  }

  const safeWidth = Math.max(width, 420);
  const innerWidth = safeWidth - PADDING_X * 2;
  const { topo, incoming, outgoing } = buildTopology(definition);
  const { cols, nodeWidth: initialNodeWidth } = chooseColumns(innerWidth);
  const nodeWidth =
    cols === 1
      ? Math.max(170, Math.min(initialNodeWidth, innerWidth - 2 * 74))
      : initialNodeWidth;
  const nodesById = new Map<string, PositionedNode>();
  const rows: string[][] = [];
  const rowOf = new Map<string, number>();

  for (let i = 0; i < topo.length; i++) {
    const id = topo[i];
    const parents = incoming.get(id) ?? [];
    let minRow = 0;
    for (let p = 0; p < parents.length; p++) {
      minRow = Math.max(minRow, (rowOf.get(parents[p]) ?? 0) + 1);
    }

    let rowIndex = minRow;
    while ((rows[rowIndex]?.length ?? 0) >= cols) {
      rowIndex += 1;
    }
    if (!rows[rowIndex]) {
      rows[rowIndex] = [];
    }
    rows[rowIndex].push(id);
    rowOf.set(id, rowIndex);
  }

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const rowIds = rows[rowIndex] ?? [];
    const rowCount = rowIds.length;
    const totalWidth = rowCount * nodeWidth + (rowCount - 1) * H_GAP;
    let x = PADDING_X + (innerWidth - totalWidth) / 2;
    const heights = rowIds.map((id) => {
      const node = definition.nodes.find((n) => n.id === id);
      return node ? nodeHeight(node.shape) : RECT_HEIGHT;
    });
    const rowHeight = Math.max(...heights);

    for (let i = 0; i < rowIds.length; i++) {
      const id = rowIds[i];
      const node = definition.nodes.find((n) => n.id === id);
      if (!node) {
        continue;
      }
      const height = nodeHeight(node.shape);
      const y =
        PADDING_Y + rowIndex * (RECT_HEIGHT + V_GAP) + (rowHeight - height) / 2;
      nodesById.set(id, {
        ...node,
        x,
        y,
        width: nodeWidth,
        height,
        rank: rowIndex,
        visualRow: rowIndex,
      });
      x += nodeWidth + H_GAP;
    }
  }

  const sourceEdgeCount = new Map<string, number>();
  const sourceEdges = new Map<string, FlowEdge[]>();
  const sourceMinTargetY = new Map<string, number>();
  for (let i = 0; i < definition.edges.length; i++) {
    const edge = definition.edges[i];
    const list = sourceEdges.get(edge.from) ?? [];
    list.push(edge);
    sourceEdges.set(edge.from, list);
  }
  for (let i = 0; i < definition.edges.length; i++) {
    const edge = definition.edges[i];
    const to = nodesById.get(edge.to);
    if (!to) {
      continue;
    }
    const current = sourceMinTargetY.get(edge.from);
    sourceMinTargetY.set(
      edge.from,
      current === undefined ? to.y : Math.min(current, to.y),
    );
  }
  const sourceSplitY = new Map<string, number>();
  const mobileTargetSideUsage = new Map<
    string,
    { left: number; right: number }
  >();
  const nodeListForBounds = Array.from(nodesById.values());
  const globalMinNodeX = Math.min(...nodeListForBounds.map((n) => n.x));
  const globalMaxNodeX = Math.max(
    ...nodeListForBounds.map((n) => n.x + n.width),
  );
  const edges = definition.edges
    .map((edge, edgeIndex) => {
      const from = nodesById.get(edge.from);
      const to = nodesById.get(edge.to);
      if (!from || !to) {
        return undefined;
      }

      const sourceIndex = sourceEdgeCount.get(from.id) ?? 0;
      sourceEdgeCount.set(from.id, sourceIndex + 1);
      const sourceOutCount = outgoing.get(from.id)?.length ?? 1;

      const sourceList = sourceEdges.get(from.id) ?? [];
      const listIndex = Math.max(
        0,
        sourceList.findIndex(
          (candidate) =>
            candidate.to === edge.to && candidate.label === edge.label,
        ),
      );
      const branchSlot =
        sourceOutCount <= 1
          ? 0
          : sourceOutCount === 2
            ? listIndex === 0
              ? -1
              : 1
            : listIndex - Math.floor(sourceOutCount / 2);

      const sx = from.x + from.width / 2;
      const sy = from.y + from.height;
      const tx = to.x + to.width / 2;
      const ty = to.y;

      const sameRow = from.visualRow === to.visualRow && tx > sx;
      const rightLaneLimit = safeWidth - PADDING_X - 8;
      const leftLaneLimit = PADDING_X + 8;
      const rightOutsideMin = globalMaxNodeX + 10;
      const leftOutsideMax = globalMinNodeX - 10;
      const path = sameRow
        ? `M ${from.x + from.width} ${from.y + from.height / 2} L ${to.x} ${to.y + to.height / 2}`
        : (() => {
            let splitY = sourceSplitY.get(from.id);
            if (splitY === undefined) {
              const preferred = sy + 20;
              const minTarget = sourceMinTargetY.get(from.id) ?? ty;
              splitY = Math.min(preferred, minTarget - 14);
              sourceSplitY.set(from.id, splitY);
            }

            if (from.shape === 'diamond' && sourceOutCount === 2) {
              if (cols === 1) {
                const centerX = from.x + from.width / 2;
                if (
                  definition.title === 'Build Flow' &&
                  edge.from === 'lazy' &&
                  edge.to === 'skipLazy'
                ) {
                  const branchSplitY = sy + 24;
                  const targetSideY = to.y + to.height / 2;
                  const laneX = Math.min(
                    safeWidth - PADDING_X - 8,
                    to.x + to.width + 26,
                  );
                  const targetSideX = to.x + to.width;
                  return `M ${centerX} ${sy} L ${centerX} ${branchSplitY} L ${laneX} ${branchSplitY} L ${laneX} ${targetSideY} L ${targetSideX} ${targetSideY}`;
                }
                const isYesBranch = edge.label === 'Yes';
                if (isYesBranch) {
                  return `M ${centerX} ${sy} L ${centerX} ${ty}`;
                }

                const laneOffsets = [6, 20, 34, 48, 62];
                const laneOffset = laneOffsets[edgeIndex % laneOffsets.length];
                const preferredRight = edgeIndex % 2 === 0;
                const rightLaneX = rightLaneLimit - laneOffset;
                const leftLaneX = leftLaneLimit + laneOffset;
                const rightAvailable = rightLaneX >= rightOutsideMin;
                const leftAvailable = leftLaneX <= leftOutsideMax;
                const usage = mobileTargetSideUsage.get(edge.to) ?? {
                  left: 0,
                  right: 0,
                };
                const forcedSide =
                  definition.title === 'Build Flow' && edge.to === 'skipLazy'
                    ? edge.from === 'lazy'
                      ? 'right'
                      : 'left'
                    : undefined;
                let useRightSide: boolean;
                if (forcedSide === 'right' && rightAvailable) {
                  useRightSide = true;
                } else if (forcedSide === 'left' && leftAvailable) {
                  useRightSide = false;
                } else if (rightAvailable && leftAvailable) {
                  if (usage.right === usage.left) {
                    useRightSide = preferredRight;
                  } else {
                    useRightSide = usage.right < usage.left;
                  }
                } else {
                  useRightSide =
                    (preferredRight && rightAvailable) ||
                    (!leftAvailable && rightAvailable);
                }
                mobileTargetSideUsage.set(edge.to, {
                  left: usage.left + (useRightSide ? 0 : 1),
                  right: usage.right + (useRightSide ? 1 : 0),
                });
                const laneX = useRightSide ? rightLaneX : leftLaneX;
                const branchSplitY = sy + 26;
                const targetSideX = useRightSide ? to.x + to.width : to.x;
                const targetSideY = to.y + to.height / 2;
                return `M ${centerX} ${sy} L ${centerX} ${branchSplitY} L ${laneX} ${branchSplitY} L ${laneX} ${targetSideY} L ${targetSideX} ${targetSideY}`;
              }

              const branchX = from.x + from.width / 2 + branchSlot * 62;
              const targetTopX = tx;
              const targetApproachY = Math.min(ty - 14, splitY + 18);
              return `M ${from.x + from.width / 2} ${sy} L ${from.x + from.width / 2} ${splitY - 4} L ${branchX} ${splitY} L ${branchX} ${targetApproachY} L ${targetTopX} ${targetApproachY} L ${targetTopX} ${ty}`;
            }

            if (cols === 1 && to.visualRow - from.visualRow > 1) {
              if (
                definition.title === 'Build Flow' &&
                edge.from === 'skipPreparse' &&
                edge.to === 'skipLazy'
              ) {
                const startY = sy + 22;
                const targetSideY = to.y + to.height / 2;
                const laneX = Math.max(PADDING_X + 8, to.x - 26);
                const targetSideX = to.x;
                return `M ${sx} ${sy} L ${sx} ${startY} L ${laneX} ${startY} L ${laneX} ${targetSideY} L ${targetSideX} ${targetSideY}`;
              }

              const laneOffsets = [0, 14, 28, 42, 56];
              const laneOffset =
                laneOffsets[(edgeIndex + 1) % laneOffsets.length];
              const preferredRight = edgeIndex % 2 === 1;
              const rightLaneX = rightLaneLimit - laneOffset;
              const leftLaneX = leftLaneLimit + laneOffset;
              const rightAvailable = rightLaneX >= rightOutsideMin;
              const leftAvailable = leftLaneX <= leftOutsideMax;
              const usage = mobileTargetSideUsage.get(edge.to) ?? {
                left: 0,
                right: 0,
              };
              const forcedSide =
                definition.title === 'Build Flow' && edge.to === 'skipLazy'
                  ? edge.from === 'lazy'
                    ? 'right'
                    : 'left'
                  : undefined;
              let useRightSide: boolean;
              if (forcedSide === 'right' && rightAvailable) {
                useRightSide = true;
              } else if (forcedSide === 'left' && leftAvailable) {
                useRightSide = false;
              } else if (rightAvailable && leftAvailable) {
                if (usage.right === usage.left) {
                  useRightSide = preferredRight;
                } else {
                  useRightSide = usage.right < usage.left;
                }
              } else {
                useRightSide =
                  (preferredRight && rightAvailable) ||
                  (!leftAvailable && rightAvailable);
              }
              mobileTargetSideUsage.set(edge.to, {
                left: usage.left + (useRightSide ? 0 : 1),
                right: usage.right + (useRightSide ? 1 : 0),
              });
              const laneX = useRightSide ? rightLaneX : leftLaneX;
              const startY = sy + 24;
              const targetSideX = useRightSide ? to.x + to.width : to.x;
              const targetSideY = to.y + to.height / 2;
              return `M ${sx} ${sy} L ${sx} ${startY} L ${laneX} ${startY} L ${laneX} ${targetSideY} L ${targetSideX} ${targetSideY}`;
            }

            const laneSpread = Math.floor(sourceIndex / 2) * 8;
            const laneX =
              sx +
              branchSlot * 16 +
              (sourceIndex % 2 === 0 ? laneSpread : -laneSpread);
            const channelY = Math.min(
              ty - 14,
              splitY + Math.abs(branchSlot) * 6,
            );

            return `M ${sx} ${sy} L ${sx} ${splitY - 6} L ${laneX} ${splitY} L ${laneX} ${channelY} L ${tx} ${channelY} L ${tx} ${ty}`;
          })();

      let labelX = sameRow ? (from.x + from.width + to.x) / 2 : (sx + tx) / 2;
      let labelY = sameRow
        ? from.y + from.height / 2 - 8
        : Math.min(ty - 24, (sourceSplitY.get(from.id) ?? sy + 18) - 12);

      if (!sameRow && edge.label && sourceOutCount > 1) {
        if (cols === 1 && from.shape === 'diamond' && sourceOutCount === 2) {
          const centerX = from.x + from.width / 2;
          const branchLabelY = sy + 16;
          if (edge.label === 'Yes') {
            labelX = centerX - 38;
            labelY = branchLabelY;
          } else if (edge.label === 'No') {
            labelX = centerX + 38;
            labelY = branchLabelY;
          }
        } else {
          const direction = branchSlot >= 0 ? 1 : -1;
          labelX =
            from.shape === 'diamond' && sourceOutCount === 2
              ? from.x + from.width / 2 + direction * 44
              : sx + direction * (24 + Math.abs(branchSlot) * 10);
          labelY = (sourceSplitY.get(from.id) ?? sy + 18) - 16;
        }
      }

      return {
        ...edge,
        path,
        labelX,
        labelY,
      };
    })
    .filter(
      (
        edge,
      ): edge is FlowEdge & {
        path: string;
        labelX: number;
        labelY: number;
      } => edge !== undefined,
    );

  const nodes = Array.from(nodesById.values());
  const maxY = Math.max(...nodes.map((node) => node.y + node.height), 0);

  return {
    width: safeWidth,
    height: maxY + PADDING_Y,
    nodes,
    edges,
  };
}

function textBlockHeight(lineCount: number): number {
  const lineHeight = 20;
  return (lineCount - 1) * lineHeight;
}

export function CompilerFlowDiagram({ kind }: { kind: DiagramKind }) {
  const definition = kind === 'build' ? BUILD : RUNTIME;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(980);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      setWidth(Math.max(320, Math.floor(entry.contentRect.width)));
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(
    () => layoutDiagram(definition, width - 2),
    [definition, width],
  );

  const hostStyle = useMemo<CSSProperties>(
    () =>
      ({
        '--flow-accent':
          kind === 'build'
            ? 'color-mix(in srgb, var(--brand) 64%, #8cc4ff)'
            : 'color-mix(in srgb, var(--brand-2) 78%, #8df2e8)',
      }) as CSSProperties,
    [kind],
  );

  return (
    <div className="compilerFlowHost" ref={hostRef} style={hostStyle}>
      <p className="compilerFlowTitle">{definition.title}</p>
      <svg
        className="compilerFlowSvg"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width="100%"
        role="img"
        aria-label={definition.title}
      >
        <defs>
          <marker
            id={`arrow-${kind}`}
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--flow-accent)" />
          </marker>
        </defs>

        <g className="compilerFlowEdges">
          {layout.edges.map((edge) => (
            <g key={`${edge.from}-${edge.to}`}>
              <path
                d={edge.path}
                className="compilerFlowEdge"
                markerEnd={`url(#arrow-${kind})`}
              />
              {edge.label ? (
                <text
                  x={edge.labelX}
                  y={edge.labelY}
                  className="compilerFlowEdgeLabel"
                  textAnchor="middle"
                >
                  {edge.label}
                </text>
              ) : null}
            </g>
          ))}
        </g>

        <g className="compilerFlowNodes">
          {layout.nodes.map((node) => {
            const cx = node.x + node.width / 2;
            const cy = node.y + node.height / 2;
            const lines = splitLabel(node.label, node.width);
            const shift = textBlockHeight(lines.length) / 2;

            return (
              <g
                key={node.id}
                className={`compilerFlowNode compilerFlowNode--${node.tone ?? 'neutral'}`}
              >
                {node.shape === 'rect' ? (
                  <rect
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={node.height}
                    rx="18"
                    ry="18"
                    className="compilerFlowShape"
                  />
                ) : (
                  <polygon
                    points={`${cx},${node.y} ${node.x + node.width},${cy} ${cx},${node.y + node.height} ${node.x},${cy}`}
                    className="compilerFlowShape"
                  />
                )}

                <text
                  x={cx}
                  y={cy - shift}
                  className="compilerFlowNodeLabel"
                  textAnchor="middle"
                >
                  {lines.map((line, index) => (
                    <tspan
                      key={`${node.id}-${index}`}
                      x={cx}
                      dy={index === 0 ? 0 : 20}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
