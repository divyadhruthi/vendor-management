import { useEffect, useState } from 'react';
import { ClipboardList, Plus, Calendar, User, GripVertical } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { fetchTasks, createTask, updateTask, fetchProjects, fetchVendors } from '../utils/api';

const COLUMNS = [
  { key: 'Pending', color: 'border-amber-400 bg-amber-50' },
  { key: 'Assigned', color: 'border-blue-400 bg-blue-50' },
  { key: 'In Progress', color: 'border-indigo-400 bg-indigo-50' },
  { key: 'Completed', color: 'border-emerald-400 bg-emerald-50' },
];
const PRIORITIES = ['Low', 'Medium', 'High'];

const emptyForm = {
  task_name: '', project_name: '', project_id: '', vendor_name: '', vendor_id: '',
  status: 'Pending', priority: 'Medium', due_date: '', description: '', notes: '',
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.allSettled([fetchTasks(), fetchProjects(), fetchVendors()])
      .then(([tRes, pRes, vRes]) => {
        if (tRes.status === 'fulfilled') setTasks(tRes.value?.data || tRes.value || []);
        if (pRes.status === 'fulfilled') setProjects(pRes.value?.data || pRes.value || []);
        if (vRes.status === 'fulfilled') setVendors(vRes.value?.data || vRes.value || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const tasksByStatus = (status) =>
    tasks.filter((t) => (t.status || 'Pending') === status);

  const moveTask = async (task, newStatus) => {
    try {
      await updateTask(task._id || task.id, { ...task, status: newStatus });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createTask(form);
      setShowModal(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">Tasks</h2>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add Task</button>
      </div>

      {tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <ClipboardList className="mb-3 h-12 w-12 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No tasks created yet</p>
          <p className="mt-1 text-xs text-slate-400">Add tasks to track and manage work across your projects</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-4"><Plus className="h-4 w-4" /> Add Task</button>
        </div>
      )}

      {/* Kanban Board */}
      <div className={`grid gap-4 lg:grid-cols-4 ${tasks.length === 0 ? 'hidden' : ''}`}>
        {COLUMNS.map((col) => {
          const colTasks = tasksByStatus(col.key);
          return (
            <div key={col.key} className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/50">
              {/* Column header */}
              <div className={`flex items-center justify-between rounded-t-xl border-b-2 px-4 py-3 ${col.color}`}>
                <h3 className="text-sm font-semibold text-slate-700">{col.key}</h3>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-600 shadow-sm">
                  {colTasks.length}
                </span>
              </div>

              {/* Cards */}
              <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-3" style={{ minHeight: 200 }}>
                {colTasks.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">No {col.key.toLowerCase()} tasks</p>
                ) : (
                  colTasks.map((task) => (
                    <div key={task._id || task.id} className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm transition hover:shadow-md">
                      <h4 className="mb-1.5 text-sm font-semibold text-slate-800 line-clamp-2">{task.task_name}</h4>
                      {task.project_name && (
                        <p className="mb-1 text-xs text-slate-400">{task.project_name}</p>
                      )}
                      {task.vendor_name && (
                        <p className="mb-2 flex items-center gap-1 text-xs text-slate-500">
                          <User className="h-3 w-3" /> {task.vendor_name}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <StatusBadge status={task.priority} />
                        {task.due_date && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Calendar className="h-3 w-3" /> {fmt(task.due_date)}
                          </span>
                        )}
                      </div>
                      {/* Quick move buttons */}
                      <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-100 pt-2">
                        {COLUMNS.filter((c) => c.key !== col.key).map((target) => (
                          <button
                            key={target.key}
                            onClick={() => moveTask(task, target.key)}
                            className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 transition hover:bg-primary-100 hover:text-primary-700"
                          >
                            → {target.key}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Task">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Task Name *</label>
            <input className="input-field" required value={form.task_name} onChange={(e) => setForm({ ...form, task_name: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Project</label>
              <select className="input-field" value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })}>
                <option value="">Select project</option>
                {projects.map((p) => <option key={p._id || p.id} value={p.project_name}>{p.project_name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Vendor</label>
              <select className="input-field" value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}>
                <option value="">Select vendor</option>
                {vendors.map((v) => <option key={v._id || v.id} value={v.vendor_name}>{v.vendor_name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Priority</label>
              <select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Due Date</label>
              <input className="input-field" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea className="input-field" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Add Task'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
