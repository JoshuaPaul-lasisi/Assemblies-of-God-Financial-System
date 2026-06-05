import React, { useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { getHierarchyTree, createDistrict, createSection, createChurch, deleteChurch, deleteSection, deleteDistrict } from '../api';
import { HierarchyTreeNode } from '../components/HierarchyTree';
import type { HierarchyNode } from '../types';

interface Props {
  canEdit?: boolean;
}

export function HierarchyPage({ canEdit }: Props) {
  const [tree, setTree] = useState<HierarchyNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ type: string; parent?: HierarchyNode } | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getHierarchyTree();
      setTree(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAddChild = (node: HierarchyNode) => {
    const childTypes: Record<string, string> = {
      general_council: 'district',
      district: 'section',
      section: 'local_church',
    };
    setModal({ type: childTypes[node.type], parent: node });
    setFormData({});
    setError('');
  };

  const handleDelete = async (node: HierarchyNode) => {
    if (!confirm(`Delete "${node.name}"? This action cannot be undone.`)) return;
    try {
      if (node.type === 'local_church') await deleteChurch(node.id);
      else if (node.type === 'section') await deleteSection(node.id);
      else if (node.type === 'district') await deleteDistrict(node.id);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Delete failed');
    }
  };

  const handleSave = async () => {
    if (!modal) return;
    setSaving(true);
    setError('');
    try {
      if (modal.type === 'district') {
        await createDistrict({ ...formData, general_council_id: modal.parent?.id });
      } else if (modal.type === 'section') {
        await createSection({ ...formData, district_id: modal.parent?.id });
      } else if (modal.type === 'local_church') {
        await createChurch({ ...formData, section_id: modal.parent?.id });
      }
      setModal(null);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const typeLabels: Record<string, string> = {
    district: 'District',
    section: 'Section',
    local_church: 'Local Church',
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Church Hierarchy</h1>
          <p className="text-sm text-gray-500 mt-1">General Council → Districts → Sections → Local Churches</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-navy-600 hover:text-navy-900 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-700" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          {tree.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No hierarchy data found</div>
          ) : (
            <div className="space-y-2">
              {tree.map(node => (
                <HierarchyTreeNode
                  key={`gc-${node.id}`}
                  node={node}
                  onEdit={() => {}}
                  onDelete={handleDelete}
                  onAddChild={handleAddChild}
                  canEdit={canEdit}
                  depth={0}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Child Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-navy-900 mb-4">
              Add {typeLabels[modal.type]} to {modal.parent?.name}
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                  placeholder={`${typeLabels[modal.type]} name`}
                />
              </div>

              {modal.type === 'local_church' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pastor Name</label>
                    <input
                      type="text"
                      value={formData.pastor_name || ''}
                      onChange={e => setFormData({ ...formData, pastor_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                      placeholder="Rev. John Smith"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Member Count</label>
                    <input
                      type="number"
                      value={formData.member_count || ''}
                      onChange={e => setFormData({ ...formData, member_count: parseInt(e.target.value) })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                      placeholder="0"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModal(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.name}
                className="flex-1 bg-navy-800 text-white py-2 rounded-lg hover:bg-navy-700 text-sm font-medium disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
