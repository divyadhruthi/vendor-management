import { useEffect, useState } from 'react';
import { Building2, Plus, Search, Star, Phone, MapPin, Filter, X, ClipboardList, Calendar, FolderKanban } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { fetchVendors, fetchVendor, createVendor, updateVendor, deleteVendor } from '../utils/api';

const SKILL_CATEGORIES = [
  'Carpenter', 'Electrician', 'Plumber', 'Painter', 'Mason',
  'Interior Designer', 'Fabricator', 'Glass Worker', 'Flooring',
  'HVAC', 'Furniture', 'Civil', 'Other',
];
const STATUSES = ['Active', 'Inactive', 'Busy'];

const emptyForm = {
  vendor_name: '', company_name: '', skill_category: '', phone: '', email: '',
  address: '', city: '', gst_number: '', status: 'Active', notes: '',
};

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [vendorDetail, setVendorDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = () => {
    setLoading(true);
    fetchVendors()
      .then((res) => setVendors(res?.data || res || []))
      .catch(() => setVendors([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = vendors.filter((v) => {
    if (filterCategory && (v.skill_category || v.category || '').toLowerCase() !== filterCategory.toLowerCase()) return false;
    if (filterStatus && (v.status || '').toLowerCase() !== filterStatus.toLowerCase()) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        (v.vendor_name || '').toLowerCase().includes(s) ||
        (v.company_name || '').toLowerCase().includes(s)
      );
    }
    return true;
  });

  const openDetail = async (v) => {
    setShowDetail(v);
    setVendorDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetchVendor(v._id || v.id);
      setVendorDetail(res?.data || res || null);
    } catch (_) {
      setVendorDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setShowDetail(null);
    setVendorDetail(null);
  };

  const openAdd = () => { setForm(emptyForm); setEditing(null); setShowModal(true); };
  const openEdit = (v) => {
    setForm({ ...emptyForm, ...v });
    setEditing(v._id || v.id);
    closeDetail();
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await updateVendor(editing, form);
      else await createVendor(form);
      setShowModal(false);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this vendor?')) return;
    try {
      await deleteVendor(id);
      closeDetail();
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const renderStars = (rating) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
    ));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">Vendors</h2>
        <button onClick={openAdd} className="btn-primary"><Plus className="h-4 w-4" /> Add Vendor</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input-field pl-9" placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field w-auto" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {SKILL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input-field w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <Building2 className="mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">{search || filterCategory || filterStatus ? 'No vendors match your filters' : 'No vendors registered yet'}</p>
          <p className="mt-1 text-xs text-slate-400">{search || filterCategory || filterStatus ? 'Try adjusting your search or filters' : 'Add your first vendor or contractor to get started'}</p>
          {!search && !filterCategory && !filterStatus && (
            <button onClick={openAdd} className="btn-primary mt-4"><Plus className="h-4 w-4" /> Add Vendor</button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((v) => (
            <div
              key={v._id || v.id}
              onClick={() => openDetail(v)}
              className="cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-primary-200"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">{v.vendor_name}</h3>
                  {v.company_name && <p className="text-sm text-slate-500">{v.company_name}</p>}
                </div>
                <StatusBadge status={v.status} />
              </div>
              <p className="mb-2 text-sm font-medium text-primary-600">{v.skill_category || v.category || '—'}</p>
              <div className="mb-3 flex items-center gap-0.5">
                {v.rating ? renderStars(v.rating) : <span className="text-xs text-slate-400">Not yet rated</span>}
              </div>
              <div className="space-y-1 text-sm text-slate-500">
                {v.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {v.phone}</p>}
                {v.city && <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {v.city}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!showDetail} onClose={closeDetail} title="Vendor Details" wide>
        {showDetail && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{showDetail.vendor_name}</h3>
              <StatusBadge status={showDetail.status} />
            </div>
            {showDetail.company_name && <p className="text-sm text-slate-500">{showDetail.company_name}</p>}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-400">Category:</span><p className="font-medium">{showDetail.skill_category || '—'}</p></div>
              <div><span className="text-slate-400">Rating:</span><div className="flex gap-0.5 mt-1">{showDetail.rating ? renderStars(showDetail.rating) : <span className="text-xs text-slate-400">Not yet rated</span>}</div></div>
              <div><span className="text-slate-400">Phone:</span><p className="font-medium">{showDetail.phone || '—'}</p></div>
              <div><span className="text-slate-400">Email:</span><p className="font-medium">{showDetail.email || '—'}</p></div>
              <div><span className="text-slate-400">City:</span><p className="font-medium">{showDetail.city || '—'}</p></div>
              <div><span className="text-slate-400">GST:</span><p className="font-medium">{showDetail.gst_number || '—'}</p></div>
            </div>
            {showDetail.address && <div className="text-sm"><span className="text-slate-400">Address:</span><p className="font-medium">{showDetail.address}</p></div>}
            {showDetail.notes && <div className="text-sm"><span className="text-slate-400">Notes:</span><p className="font-medium">{showDetail.notes}</p></div>}

            {/* Assigned Work Section */}
            <div className="border-t pt-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <FolderKanban className="h-4 w-4 text-primary-500" />
                Assigned Projects & Tasks
              </h4>
              {detailLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                </div>
              ) : vendorDetail?.tasks?.length > 0 ? (
                <div className="space-y-2">
                  {vendorDetail.tasks.map((task) => (
                    <div key={task.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 text-sm">{task.title}</p>
                          {task.project_title && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                              <FolderKanban className="h-3 w-3" /> {task.project_title}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        {task.start_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Start: {new Date(task.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Due: {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                        {task.estimated_cost != null && (
                          <span>Est: ₹{Number(task.estimated_cost).toLocaleString('en-IN')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-center">
                  <ClipboardList className="mb-2 h-8 w-8 text-slate-200" />
                  <p className="text-sm text-slate-400">No projects assigned yet</p>
                  <p className="text-xs text-slate-300">Assign tasks to this vendor from the Tasks page</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t pt-4">
              <button onClick={() => openEdit(showDetail)} className="btn-primary flex-1">Edit</button>
              <button onClick={() => handleDelete(showDetail._id || showDetail.id)} className="btn-secondary flex-1 !text-red-600 hover:!bg-red-50">Delete</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Vendor' : 'Add Vendor'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Vendor Name *</label>
              <input className="input-field" required value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Company Name</label>
              <input className="input-field" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Skill Category *</label>
              <select className="input-field" required value={form.skill_category} onChange={(e) => setForm({ ...form, skill_category: e.target.value })}>
                <option value="">Select category</option>
                {SKILL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
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
              <label className="mb-1 block text-sm font-medium text-slate-700">City</label>
              <input className="input-field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">GST Number</label>
              <input className="input-field" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
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
              {saving ? 'Saving...' : editing ? 'Update Vendor' : 'Add Vendor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
