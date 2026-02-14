import React, { JSX, useMemo } from "react";
import "./ExpressionTree.css";
import { IExpression } from '@rs-x/expression-parser';


interface IExpressionTreeProps {
  root: IExpression;
  levelHeight?: number;
  horizontalSpacing?: number;
  padding?: number;
}

interface LayoutNode {
  x: number;
  y: number;
  radius: number;
  expression: IExpression;
}

export const ExpressionTree: React.FC<IExpressionTreeProps> = ({
  root,
  levelHeight = 120,
  horizontalSpacing = 40,
  padding = 40,
}) => {
  const { nodes, edges, width, height } = useMemo(() => {
    const nodes: LayoutNode[] = [];
    const edges: JSX.Element[] = [];

    let currentX = padding;

    const measureTextWidth = (text: string) => {
      return text.length * 8; // simple monospace estimation
    };

    const layout = (
      expression: IExpression,
      depth: number
    ): { x: number; radius: number } => {
      const expressionText = expression.expressionString;
      const valueText = String(expression.value ?? "");

      const maxTextWidth = Math.max(
        measureTextWidth(expressionText),
        measureTextWidth(valueText)
      );

      const radius = Math.max(40, maxTextWidth / 2 + 20);

      const y = depth * levelHeight + padding;

      if (!expression.childExpressions.length) {
        const x = currentX + radius;
        currentX += radius * 2 + horizontalSpacing;

        nodes.push({ x, y, radius, expression });

        return { x, radius };
      }

      const children = expression.childExpressions.map((child) =>
        layout(child, depth + 1)
      );

      const minX = children[0].x;
      const maxX = children[children.length - 1].x;
      const x = (minX + maxX) / 2;

      nodes.push({ x, y, radius, expression });

      children.forEach((child) => {
        edges.push(
          <line
            key={`${x}-${y}-${child.x}`}
            x1={x}
            y1={y + radius}
            x2={child.x}
            y2={(depth + 1) * levelHeight + padding - child.radius}
            className="tree-edge"
          />
        );
      });

      return { x, radius };
    };

    layout(root, 0);

    const width = currentX + padding;
    const height =
      Math.max(...nodes.map((n) => n.y)) + levelHeight + padding;

    return { nodes, edges, width, height };
  }, [root, levelHeight, horizontalSpacing, padding]);

  return (
    <svg
      className="expression-tree"
      width={width}
      height={height}
    >
      {edges}
      {nodes.map((node, index) => (
        <g key={index} className="tree-node">
          <circle
            cx={node.x}
            cy={node.y}
            r={node.radius}
            className="tree-node-circle"
          />
          <text
            x={node.x}
            y={node.y - 6}
            textAnchor="middle"
            className="tree-node-expression"
          >
            {node.expression.expressionString}
          </text>
          <text
            x={node.x}
            y={node.y + 14}
            textAnchor="middle"
            className="tree-node-value"
          >
            {String(node.expression.value ?? "")}
          </text>
        </g>
      ))}
    </svg>
  );
};