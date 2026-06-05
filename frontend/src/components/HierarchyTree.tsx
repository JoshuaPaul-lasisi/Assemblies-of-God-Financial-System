import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Building2, Map, Layers, Church, Pencil, Trash2, Plus } from 'lucide-react';
import type { HierarchyNode } from '../types';

interface Props {
  node: HierarchyNode;
  onEdit?: (node: HierarchyNode) => void;
  onDelete?: (node: HierarchyNode) => void;
  onAddChild?: (node: HierarchyNode) => void;
  canEdit?: boolean;
  depth?: number;
}

const typeConfig = {
  general_council: { icon: Building2, color: 'text-navy-700', bg: 'bg-navy-100' },
  district: { icon: Map, color: 'text-blue-700', bg: 'bg-blue-100' },
  section: { icon: Layers, color: 'text-indigo-700', bg: 'bg-indigo-100' },
  local_church: { icon: Church, color: 'text-purple-700', bg: 'bg-purple-100' },
};

const childTypeMap: Record<string, string> = {
  general_council: 'district',
  district: 'section',
  section: 'local_church',
};

export function HierarchyTreeNode({ node, onEdit, onDelete, onAddChild, canEdit, depth = 0 }: Props) {
  const [expanded, setExpanded] = useState(depth < 2);
  const config = typeConfig[node.type as keyof typeof typeConfig] || typeConfig.local_church;
  const Icon = config.icon;
  const hasChildren = node.children && node.children.length > 0;
  const canHaveChildren = node.type !== 'local_church';

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 group cursor-pointer ${depth === 0 ? 'border border-gray-200' : ''}`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-5 h-5 flex items-center justify-center text-gray-400 flex-shrink-0"
        >
          {hasChildren ? (
            expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <span className="w-2 h-2 rounded-full bg-gray-200 block mx-auto" />
          )}
        </button>

        <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${config.bg}`}>
          <Icon size={14} className={config.color} />
        </div>

        <div className="flex-1 min-w-0" onClick={() => setExpanded(!expanded)}>
          <div className="font-medium text-sm text-gray-900 truncate">{node.name}</div>
          <div className="text-xs text-gray-400 capitalize">
            {node.type.replace('_', ' ')}
            {node.member_count !== undefined && ` · ${node.member_count} members`}
            {node.pastor_name && ` · ${node.pastor_name}`}
            {node.country && ` · ${node.country}`}
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canHaveChildren && (
              <button
                onClick={(e) => { e.stopPropagation(); onAddChild?.(node); }}
                className="p-1 text-gray-400 hover:text-green-600 rounded"
                title={`Add ${childTypeMap[node.type]}`}
              >
                <Plus size={13} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(node); }}
              className="p-1 text-gray-400 hover:text-blue-600 rounded"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(node); }}
              className="p-1 text-gray-400 hover:text-red-600 rounded"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {expanded && hasChildren && (
        <div className="ml-2">
          {node.children.map((child) => (
            <HierarchyTreeNode
              key={`${child.type}-${child.id}`}
              node={child}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              canEdit={canEdit}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
