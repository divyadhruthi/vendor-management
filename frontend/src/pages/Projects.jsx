import { useEffect, useState } from 'react';
import { FolderKanban, Plus, Search, Calendar, DollarSign, User } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { fetchProjects, createProject, updateProject, deleteProject, fetchClients, fetchVendors } from '../utils/api';

const PROJECT_STATUSES = ['Planning', 'In Progress', 'Completed', 'On Hold', 'Cancelled'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const PROJECT_TYPES = ['Residential', 'Commercial', 'Office', 'Retail', 'Hospitality', 'Other'];

const emptyForm = {
  project_name: '', client_name: '', client_id: '', project_type: 'Residential',
  status: 'Planning', priority: 'Medium', budget: '', start_date: '', end_date: '',
  description: '', address: '', assigned_vendors: [], notes: '',
};

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    Promise.allSettled([fetchProjects(), fetchClients(), fetchVendors()])
      .then(([pRes, cRes, vRes]) => {
        if (pRes.status === 'fulfilled') setProjects(pRes.value?.data || pRes.value || []);
        if (cRes.status === 'fulfilled') setClients(cRes.value?.data || cRes.value || []);
        if (vRes.status === 'fulfilled') setVendors(vRes.value?.data || vRes.value || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = projects.filter((p) => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterPriority && p.priority !== filterPriority) return false;
    if (filterType && p.project_type !== filterType) return false;
    if (search) {
      const s = search.toLowerCase();
      return (p.project_name || '').toLowerCase().includes(s) || (p.client_name || '').toLowerCase().includes(s);
    }
    return true;
  });

  const openAdd = () => { setForm(emptyForm); setEditing(null); setShowModal(true); };
  const openEdit = (p) => {
    setForm({ ...emptyForm, ...p, budget: p.budget?.toString() || '' });
    setEditing(p._id || p.id);
    setShowDetail(null);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form, budget: form.budget ? Number(form.budget) : undefined };
      if (editing) await updateProject(editing, data);
      else await createProject(data);
      setShowModal(false);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project?')) return;
    try { await deleteProject(id); setShowDetail(null); load(); } catch (err) { alert(err.message); }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const fmtCurrency = (v) => v ? `₹${Number(v).toLocaleString('en-IN')}` : '—';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">Projects</h2>
        <button onClick={openAdd} className="btn-primary"><Plus className="h-4 w-4" /> Add Project</button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input-field pl-9" placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="input-field w-auto" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select className="input-field w-auto" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <FolderKanban className="mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">{search || filterStatus || filterPriority || filterType ? 'No projects match your filters' : 'No projects created yet'}</p>
          <p className="mt-1 text-xs text-slate-400">{search || filterStatus || filterPriority || filterType ? 'Try adjusting your search or filters' : 'Create your first project to begin tracking work'}</p>
          {!search && !filterStatus && !filterPriority && !filterType && (
            <button onClick={openAdd} className="btn-primary mt-4"><Plus className="h-4 w-4" /> Add Project</button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <div
              key={p._id || p.id}
              onClick={() => setShowDetail(p)}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-primary-200"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-800 line-clamp-1">{p.project_name}</h3>
                <StatusBadge status={p.status} />
              </div>
              <div className="space-y-2 text-sm text-slate-500">
                <p className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> {p.client_name || '—'}</p>
                <p className="flex items-center gap-2"><DollarSign className="h-3.5 w-3.5" /> {fmtCurrency(p.budget)}</p>
                <p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {fmt(p.start_date)} — {fmt(p.end_date)}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <StatusBadge status={p.priority} />
                {p.project_type && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{p.project_type}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title="Project Details" wide>
        {showDetail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{showDetail.project_name}</h3>
              <div className="flex gap-2">
                <StatusBadge status={showDetail.status} />
                <StatusBadge status={showDetail.priority} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
              <div><span className="text-slate-400">Client:</span><p className="font-medium">{showDetail.client_name || '—'}</p></div>
              <div><span className="text-slate-400">Type:</span><p className="font-medium">{showDetail.project_type || '—'}</p></div>
              <div><span className="text-slate-400">Budget:</span><p className="font-medium">{fmtCurrency(showDetail.budget)}</p></div>
              <div><span className="text-slate-400">Start Date:</span><p className="font-medium">{fmt(showDetail.start_date)}</p></div>
              <div><span className="text-slate-400">End Date:</span><p className="font-medium">{fmt(showDetail.end_date)}</p></div>
              <div><span className="text-slate-400">Address:</span><p className="font-medium">{showDetail.address || '—'}</p></div>
            </div>
            {showDetail.description && <div className="text-sm"><span className="text-slate-400">Description:</span><p className="mt-1 font-medium">{showDetail.description}</p></div>}
            {showDetail.assigned_vendors?.length > 0 && (
              <div className="text-sm">
                <span className="text-slate-400">Assigned Vendors:</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {showDetail.assigned_vendors.map((v, i) => (
                    <span key={i} className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">{typeof v === 'string' ? v : v.vendor_name || v.name}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 border-t pt-4">
              <button onClick={() => openEdit(showDetail)} className="btn-primary flex-1">Edit</button>
              <button onClick={() => handleDelete(showDetail._id || showDetail.id)} className="btn-secondary flex-1 !text-red-600 hover:!bg-red-50">Delete</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Project' : 'Add Project'} wide>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Project Name *</label>
              <input className="input-field" required value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Client Name *</label>
              <input className="input-field" required list="clients-list" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
              <datalist id="clients-list">
                {clients.map((c) => <option key={c._id || c.id} value={c.client_name} />)}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Project Type</label>
              <select className="input-field" value={form.project_type} onChange={(e) => setForm({ ...form, project_type: e.target.value })}>
                {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Priority</label>
              <select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Budget (₹)</label>
              <input className="input-field" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Start Date</label>
              <input className="input-field" type="date" value={form.start_date?.slice(0, 10)} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">End Date</label>
              <input className="input-field" type="date" value={form.end_date?.slice(0, 10)} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
            <input className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea className="input-field" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : editing ? 'Update Project' : 'Add Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
