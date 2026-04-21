import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Plus, FolderOpen, Trash2, Calendar, Layers, ArrowRight, BarChart3, Users, TrendingUp } from 'lucide-react';
import { moduleRegistry } from '../modules';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-2xl font-bold text-text-primary">{value}</div>
        <div className="text-xs text-text-muted font-medium">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { initiatives, createInitiative, deleteInitiative } = useApp();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const id = createInitiative(name.trim(), description.trim());
    setName('');
    setDescription('');
    setShowCreate(false);
    navigate(`/initiative/${id}`);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm('Delete this initiative? This cannot be undone.')) {
      deleteInitiative(id);
    }
  };

  const activeModuleCount = moduleRegistry.filter(m => m.status === 'active').length;

  const totalStakeholders = initiatives.reduce((sum, i) => {
    const sa = i.modules?.['stakeholder-analysis'];
    return sum + (sa?.rows?.length || 0);
  }, 0);

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      {/* Page Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Change Portfolio</h2>
          <p className="text-sm text-text-secondary mt-1">
            Overview of all your organizational change initiatives
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white font-medium rounded-lg hover:bg-accent-dark transition-colors text-sm shadow-sm shadow-accent/20"
        >
          <Plus size={16} />
          New Initiative
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard icon={FolderOpen} label="Active Initiatives" value={initiatives.length} color="bg-accent-50 text-accent" />
        <StatCard icon={Layers} label="Active Modules" value={activeModuleCount} color="bg-blue-50 text-blue-600" />
        <StatCard icon={Users} label="Stakeholders Tracked" value={totalStakeholders} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={TrendingUp} label="Assessments" value={initiatives.filter(i => i.modules?.['change-impact-assessment']?.rows?.length > 0).length} color="bg-amber-50 text-amber-600" />
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-border p-6 mb-6 slide-up">
          <h3 className="text-base font-semibold text-text-primary mb-4">Create New Change Initiative</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Initiative Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. ERP Migration Program"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description of the change initiative..."
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors"
              >
                Create Initiative
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-text-secondary rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Initiatives List */}
      {initiatives.length === 0 && !showCreate ? (
        <div className="bg-white rounded-xl border border-border text-center py-20">
          <div className="w-16 h-16 bg-accent-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <FolderOpen size={28} className="text-accent/40" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">No initiatives yet</h3>
          <p className="text-sm text-text-muted mb-6 max-w-md mx-auto">
            Create your first change initiative to begin tracking impacts, mapping stakeholders, and managing organizational change.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white font-medium rounded-lg hover:bg-accent-dark transition-colors text-sm"
          >
            <Plus size={16} />
            Create Your First Initiative
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">All Initiatives</h3>
            <span className="text-xs text-text-muted">{initiatives.length} total</span>
          </div>
          <div className="grid gap-3">
            {initiatives.map(init => {
              const impactRows = init.modules?.['change-impact-assessment']?.rows?.length || 0;
              const stakeholderRows = init.modules?.['stakeholder-analysis']?.rows?.length || 0;
              const hasModules = impactRows > 0 || stakeholderRows > 0;

              return (
                <div
                  key={init.id}
                  onClick={() => navigate(`/initiative/${init.id}`)}
                  className="bg-white rounded-xl border border-border p-5 card-hover cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors truncate">
                          {init.name}
                        </h3>
                        {hasModules ? (
                          <span className="badge bg-green-50 text-green-700 border border-green-200">Active</span>
                        ) : (
                          <span className="badge bg-gray-50 text-text-muted border border-border">New</span>
                        )}
                      </div>
                      {init.description && (
                        <p className="text-sm text-text-secondary truncate mb-2">{init.description}</p>
                      )}
                      <div className="flex items-center gap-5 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(init.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {impactRows > 0 && (
                          <span className="flex items-center gap-1">
                            <BarChart3 size={11} />
                            {impactRows} impacts
                          </span>
                        )}
                        {stakeholderRows > 0 && (
                          <span className="flex items-center gap-1">
                            <Users size={11} />
                            {stakeholderRows} stakeholders
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={(e) => handleDelete(e, init.id)}
                        className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Delete initiative"
                      >
                        <Trash2 size={15} />
                      </button>
                      <div className="p-2 text-text-muted group-hover:text-accent transition-colors">
                        <ArrowRight size={16} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
