import { useEffect, useState } from 'react';
import { FileText, Plus, Trash2, Pencil } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import { fetchQuotations, createQuotation, updateQuotation, deleteQuotation, fetchProjects } from '../utils/api';

const STATUSES = ['Draft', 'Sent', 'Approved', 'Rejected'];

const emptyLineItem = { item_name: '', description: '', quantity: 1, rate: 0, amount: 0 };
const emptyForm = {
  quotation_number: '', project_name: '', project_id: '',
  status: 'Draft', date: '', notes: '', line_items: [{ ...emptyLineItem }],
};

export default function Quotations() {
  const [quotations, setQuotations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.allSettled([fetchQuotations(), fetchProjects()])
      .then(([qRes, pRes]) => {
        if (qRes.status === 'fulfilled') setQuotations(qRes.value?.data || qRes.value || []);
        if (pRes.status === 'fulfilled') setProjects(pRes.value?.data || pRes.value || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const fmtCurrency = (v) => v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const calcTotal = (items) => items.reduce((s, i) => s + (i.amount || 0), 0);

  const updateLineItem = (index, field, value) => {
    const items = [...form.line_items];
    items[index] = { ...items[index], [field]: value };
    if (field === 'quantity' || field === 'rate') {
      items[index].amount = (Number(items[index].quantity) || 0) * (Number(items[index].rate) || 0);
    }
    setForm({ ...form, line_items: items });
  };

  const addLineItem = () => setForm({ ...form, line_items: [...form.line_items, { ...emptyLineItem }] });
  const removeLineItem = (i) => {
    if (form.line_items.length <= 1) return;
    setForm({ ...form, line_items: form.line_items.filter((_, idx) => idx !== i) });
  };

  const openAdd = () => { setForm(emptyForm); setEditing(null); setShowModal(true); };
  const openEdit = (q) => {
    setForm({
      ...emptyForm, ...q,
      line_items: q.line_items?.length ? q.line_items : [{ ...emptyLineItem }],
      date: q.date?.slice(0, 10) || '',
    });
    setEditing(q._id || q.id);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...form,
        total_amount: calcTotal(form.line_items),
        line_items: form.line_items.map((li) => ({
          ...li,
          quantity: Number(li.quantity),
          rate: Number(li.rate),
          amount: Number(li.quantity) * Number(li.rate),
        })),
      };
      if (editing) await updateQuotation(editing, data);
      else await createQuotation(data);
      setShowModal(false);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this quotation?')) return;
    try { await deleteQuotation(id); load(); } catch (err) { alert(err.message); }
  };

  const handleStatusUpdate = async (q, status) => {
    try {
      await updateQuotation(q._id || q.id, { ...q, status });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const columns = [
    { key: 'quotation_number', label: 'Quotation #', render: (v) => <span className="font-semibold text-primary-600">{v || '—'}</span> },
    { key: 'project_name', label: 'Project' },
    { key: 'total_amount', label: 'Total', render: (v) => <span className="font-semibold">{fmtCurrency(v)}</span> },
    { key: 'status', label: 'Status', render: (v, row) => (
      <select
        value={v || 'Draft'}
        onChange={(e) => { e.stopPropagation(); handleStatusUpdate(row, e.target.value); }}
        onClick={(e) => e.stopPropagation()}
        className="rounded-lg border border-slate-200 bg-transparent py-0.5 pl-2 pr-6 text-xs font-medium focus:border-primary-400 focus:outline-none"
      >
        {STATUSES.map((s) => <option key={s}>{s}</option>)}
      </select>
    )},
    { key: 'date', label: 'Date', render: (v) => fmtDate(v) },
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
        <h2 className="text-xl font-bold text-slate-800">Quotations</h2>
        <button onClick={openAdd} className="btn-primary"><Plus className="h-4 w-4" /> Add Quotation</button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      ) : (
        <DataTable columns={columns} data={quotations} emptyMessage="No quotations created yet. Click &quot;Add Quotation&quot; to prepare your first estimate." />
      )}

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Quotation' : 'Add Quotation'} wide>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Quotation Number *</label>
              <input className="input-field" required value={form.quotation_number} onChange={(e) => setForm({ ...form, quotation_number: e.target.value })} placeholder="e.g. QT-001" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Project</label>
              <select className="input-field" value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })}>
                <option value="">Select project</option>
                {projects.map((p) => <option key={p._id || p.id} value={p.project_name}>{p.project_name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
              <input className="input-field" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">Line Items</label>
              <button type="button" onClick={addLineItem} className="text-xs font-medium text-primary-600 hover:text-primary-700">+ Add Item</button>
            </div>
            <div className="space-y-3">
              {form.line_items.map((item, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-12">
                  <div className="sm:col-span-3">
                    <input className="input-field" placeholder="Item name" value={item.item_name} onChange={(e) => updateLineItem(i, 'item_name', e.target.value)} />
                  </div>
                  <div className="sm:col-span-3">
                    <input className="input-field" placeholder="Description" value={item.description} onChange={(e) => updateLineItem(i, 'description', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <input className="input-field" type="number" placeholder="Qty" min="0" value={item.quantity} onChange={(e) => updateLineItem(i, 'quantity', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <input className="input-field" type="number" placeholder="Rate" min="0" value={item.rate} onChange={(e) => updateLineItem(i, 'rate', e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">{fmtCurrency(item.amount || (Number(item.quantity) || 0) * (Number(item.rate) || 0))}</span>
                    {form.line_items.length > 1 && (
                      <button type="button" onClick={() => removeLineItem(i)} className="ml-auto rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-right">
              <span className="text-sm text-slate-500">Total: </span>
              <span className="text-lg font-bold text-slate-800">{fmtCurrency(calcTotal(form.line_items.map((i) => ({ amount: (Number(i.quantity) || 0) * (Number(i.rate) || 0) }))))}</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea className="input-field" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : editing ? 'Update Quotation' : 'Create Quotation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
