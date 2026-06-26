import { useEffect, useState } from 'react';
import { CalendarCheck, Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import { fetchSiteVisits, createSiteVisit, updateSiteVisit, deleteSiteVisit, fetchProjects } from '../utils/api';

const VISIT_STATUSES = ['Scheduled', 'Visited', 'Cancelled'];

const emptyForm = {
  project_name: '', project_id: '', scheduled_date: '', status: 'Scheduled',
  visited_by: '', notes: '', address: '',
};

export default function SiteVisits() {
  const [visits, setVisits] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.allSettled([fetchSiteVisits(), fetchProjects()])
      .then(([svRes, pRes]) => {
        if (svRes.status === 'fulfilled') setVisits(svRes.value?.data || svRes.value || []);
        if (pRes.status === 'fulfilled') setProjects(pRes.value?.data || pRes.value || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const openAdd = () => { setForm(emptyForm); setEditing(null); setShowModal(true); };
  const openEdit = (v) => {
    setForm({
      ...emptyForm, ...v,
      scheduled_date: v.scheduled_date?.slice(0, 10) || '',
    });
    setEditing(v._id || v.id);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await updateSiteVisit(editing, form);
      else await createSiteVisit(form);
      setShowModal(false);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this site visit?')) return;
    try { await deleteSiteVisit(id); load(); } catch (err) { alert(err.message); }
  };

  // Group visits by date for calendar-style view
  const sortedVisits = [...visits].sort(
    (a, b) => new Date(a.scheduled_date || 0) - new Date(b.scheduled_date || 0)
  );

  const columns = [
    { key: 'project_name', label: 'Project', render: (v) => <span className="font-medium text-slate-800">{v || '—'}</span> },
    { key: 'scheduled_date', label: 'Scheduled Date', render: (v) => (
      <span className="flex items-center gap-1.5">
        <CalendarCheck className="h-3.5 w-3.5 text-primary-500" />
        {fmtDate(v)}
      </span>
    )},
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'visited_by', label: 'Visited By' },
    { key: 'notes', label: 'Notes', render: (v) => <span className="line-clamp-1 max-w-xs text-slate-500">{v || '—'}</span> },
    { key: 'actions', label: 'Actions', render: (_, row) => (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600">
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleDelete(row._id || row.id); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    )},
  ];

  // Calendar-like grouped view
  const grouped = {};
  sortedVisits.forEach((v) => {
    const dateKey = v.scheduled_date?.slice(0, 10) || 'Unscheduled';
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(v);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">Site Visits</h2>
        <button onClick={openAdd} className="btn-primary"><Plus className="h-4 w-4" /> Schedule Visit</button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      ) : visits.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <CalendarCheck className="mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No site visits scheduled yet</p>
          <p className="mt-1 text-xs text-slate-400">Schedule a visit to begin site assessments for your projects</p>
          <button onClick={openAdd} className="btn-primary mt-4"><Plus className="h-4 w-4" /> Schedule Visit</button>
        </div>
      ) : (
        <>
          {/* Calendar-style grouped cards */}
          <div className="space-y-4">
            {Object.entries(grouped).map(([dateKey, dateVisits]) => (
              <div key={dateKey}>
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-semibold text-slate-500 uppercase">
                    {dateKey === 'Unscheduled' ? 'Unscheduled' : fmtDate(dateKey)}
                  </span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {dateVisits.map((visit) => (
                    <div key={visit._id || visit.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                      <div className="mb-2 flex items-start justify-between">
                        <h4 className="font-semibold text-slate-800">{visit.project_name || 'Untitled'}</h4>
                        <StatusBadge status={visit.status} />
                      </div>
                      {visit.visited_by && (
                        <p className="mb-1 text-sm text-slate-500">By: {visit.visited_by}</p>
                      )}
                      {visit.address && (
                        <p className="mb-1 flex items-center gap-1 text-xs text-slate-400">
                          <MapPin className="h-3 w-3" /> {visit.address}
                        </p>
                      )}
                      {visit.notes && (
                        <p className="mt-2 line-clamp-2 text-xs text-slate-400">{visit.notes}</p>
                      )}
                      <div className="mt-3 flex gap-1 border-t border-slate-100 pt-2">
                        <button onClick={() => openEdit(visit)} className="rounded-lg px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50">Edit</button>
                        <button onClick={() => handleDelete(visit._id || visit.id)} className="rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Table view */}
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">All Visits</h3>
            <DataTable columns={columns} data={sortedVisits} />
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Site Visit' : 'Schedule Site Visit'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Project *</label>
            <select className="input-field" required value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })}>
              <option value="">Select project</option>
              {projects.map((p) => <option key={p._id || p.id} value={p.project_name}>{p.project_name}</option>)}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Scheduled Date *</label>
              <input className="input-field" type="date" required value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {VISIT_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Visited By</label>
              <input className="input-field" value={form.visited_by} onChange={(e) => setForm({ ...form, visited_by: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
              <input className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea className="input-field" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : editing ? 'Update Visit' : 'Schedule Visit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
