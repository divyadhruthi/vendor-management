import { useEffect, useState } from 'react';
import { Users, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import { fetchClients, createClient, updateClient, deleteClient } from '../utils/api';

const CLIENT_TYPES = ['Individual', 'Corporate', 'Builder', 'Architect', 'Other'];
const PROJECT_STATUSES = ['New', 'Planning', 'Vendor Assignment', 'Work In Progress', 'On Hold', 'Completed', 'Cancelled'];

const emptyForm = {
  client_name: '', client_type: 'Individual', phone: '', email: '',
  address: '', city: '', company_name: '', gst_number: '', project_status: 'New', notes: '',
};

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    fetchClients()
      .then((res) => setClients(res?.data || res || []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = clients.filter((c) => {
    if (filterType && c.client_type !== filterType) return false;
    if (filterStatus && c.project_status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return (c.client_name || '').toLowerCase().includes(s) || (c.phone || '').includes(s);
    }
    return true;
  });

  const openAdd = () => { setForm(emptyForm); setEditing(null); setShowModal(true); };
  const openEdit = (c) => { setForm({ ...emptyForm, ...c }); setEditing(c._id || c.id); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await updateClient(editing, form);
      else await createClient(form);
      setShowModal(false);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this client?')) return;
    try { await deleteClient(id); load(); } catch (err) { alert(err.message); }
  };

  const columns = [
    { key: 'client_name', label: 'Name', render: (v, row) => (
      <div>
        <p className="font-medium text-slate-800">{v}</p>
        {row.company_name && <p className="text-xs text-slate-400">{row.company_name}</p>}
      </div>
    )},
    { key: 'client_type', label: 'Type' },
    { key: 'phone', label: 'Phone' },
    { key: 'city', label: 'City' },
    { key: 'project_status', label: 'Project Status', render: (v) => <StatusBadge status={v} /> },
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">Clients</h2>
        <button onClick={openAdd} className="btn-primary"><Plus className="h-4 w-4" /> Add Client</button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input-field pl-9" placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field w-auto" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {CLIENT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select className="input-field w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Project Statuses</option>
          {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      ) : (
        <DataTable columns={columns} data={filtered} emptyMessage={search || filterType || filterStatus ? 'No clients match your filters. Try adjusting your search criteria.' : 'No clients yet. Click "Add Client" to register your first client.'} />
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Client' : 'Add Client'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Client Name *</label>
              <input className="input-field" required value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Client Type *</label>
              <select className="input-field" required value={form.client_type} onChange={(e) => setForm({ ...form, client_type: e.target.value })}>
                {CLIENT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Phone *</label>
              <input
                className="input-field"
                required
                value={form.phone}
                maxLength={10}
                pattern="\d{10}"
                title="Please enter a valid 10-digit phone number"
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= 10) setForm({ ...form, phone: val });
                }}
              />
              {form.phone && form.phone.length < 10 && (
                <p className="mt-1 text-xs text-amber-600">{10 - form.phone.length} more digit{10 - form.phone.length !== 1 ? 's' : ''} needed</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input className="input-field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Company Name</label>
              <input className="input-field" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">City</label>
              <input className="input-field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">GST Number</label>
              <input className="input-field" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Project Status</label>
              <select className="input-field" value={form.project_status} onChange={(e) => setForm({ ...form, project_status: e.target.value })}>
                {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
            <input className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea className="input-field" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : editing ? 'Update Client' : 'Add Client'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
