import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../../components/common/Modal'
import { MOCK_USERS } from '../../data/mockUsers'

const REGIONES = [
  'Coecillo', 'Tenango', 'Pacífico', 'Tlaxcala', 'Toluca',
  'Puebla Foránea', 'Puebla', 'Montaña', 'Acapulco', 'Cuernavaca',
]
const SUBROLES_FIELD = ['TSD', 'Instructor']
const SUBROLES_EXECUTIVE = ['Regional', 'Corporativo']

const BLANK_FORM = {
  nombre: '', correo: '', password: '', rol: 'field',
  subrole: 'TSD', region: 'Coecillo', uo: '', activo: true,
}

function Badge({ children, variant }) {
  const variants = {
    executive: 'bg-purple-100 text-purple-700',
    field: 'bg-blue-100 text-blue-700',
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-500',
    tsd: 'bg-amber-100 text-amber-700',
    instructor: 'bg-teal-100 text-teal-700',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant] ?? 'bg-gray-100 text-gray-600'}`}>
      {children}
    </span>
  )
}

function UserForm({ form, setForm, isEdit, onSubmit, onCancel }) {
  const subroles = form.rol === 'field' ? SUBROLES_FIELD : SUBROLES_EXECUTIVE

  function field(label, content) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        {content}
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {field('Nombre completo',
          <input className="input-field" required value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
        )}
        {field('Correo electrónico',
          <input type="email" className="input-field" required value={form.correo}
            onChange={e => setForm(f => ({ ...f, correo: e.target.value }))} />
        )}
      </div>

      {!isEdit && field('Contraseña temporal',
        <input type="password" className="input-field" required value={form.password}
          placeholder="Mínimo 8 caracteres"
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
      )}

      <div className="grid grid-cols-2 gap-4">
        {field('Rol',
          <select className="input-field" value={form.rol}
            onChange={e => setForm(f => ({ ...f, rol: e.target.value, subrole: e.target.value === 'field' ? 'TSD' : 'Regional' }))}>
            <option value="field">Field</option>
            <option value="executive">Executive</option>
          </select>
        )}
        {field('Subrole',
          <select className="input-field" value={form.subrole}
            onChange={e => setForm(f => ({ ...f, subrole: e.target.value }))}>
            {subroles.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {field('Región',
          <select className="input-field" value={form.region}
            onChange={e => setForm(f => ({ ...f, region: e.target.value }))}>
            <option value="—">—</option>
            {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
        {field('Unidad(es) Operativa(s)',
          <input className="input-field" placeholder="Ej: KM17, Cuauhtémoc" value={form.uo}
            onChange={e => setForm(f => ({ ...f, uo: e.target.value }))} />
        )}
      </div>

      {isEdit && (
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Usuario activo</p>
            <p className="text-xs text-gray-400 mt-0.5">Los usuarios inactivos no pueden iniciar sesión</p>
          </div>
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-kof-red focus:ring-offset-2 ${form.activo ? 'bg-kof-red' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.activo ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button type="submit"
          className="flex-1 py-2.5 px-4 rounded-xl bg-kof-red text-white text-sm font-semibold hover:bg-kof-red-dark active:scale-95 transition-all">
          {isEdit ? 'Guardar cambios' : 'Crear usuario'}
        </button>
      </div>
    </form>
  )
}

export default function Users() {
  const navigate = useNavigate()
  const [users, setUsers] = useState(MOCK_USERS)
  const [search, setSearch] = useState('')
  const [filterRol, setFilterRol] = useState('todos')
  const [filterActivo, setFilterActivo] = useState('todos')
  const [modal, setModal] = useState(null) // null | 'create' | 'edit'
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState(BLANK_FORM)
  const [confirmDeactivate, setConfirmDeactivate] = useState(null)

  const filtered = users.filter(u => {
    const matchSearch = u.nombre.toLowerCase().includes(search.toLowerCase()) ||
      u.correo.toLowerCase().includes(search.toLowerCase())
    const matchRol = filterRol === 'todos' || u.rol === filterRol
    const matchActivo = filterActivo === 'todos' || (filterActivo === 'activo' ? u.activo : !u.activo)
    return matchSearch && matchRol && matchActivo
  })

  function openCreate() {
    setForm(BLANK_FORM)
    setModal('create')
  }

  function openEdit(user) {
    setEditUser(user)
    setForm({ ...user, password: '' })
    setModal('edit')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (modal === 'create') {
      setUsers(u => [...u, { ...form, id: Date.now() }])
    } else {
      setUsers(u => u.map(x => x.id === editUser.id ? { ...x, ...form } : x))
    }
    setModal(null)
  }

  function toggleActivo(user) {
    setUsers(u => u.map(x => x.id === user.id ? { ...x, activo: !x.activo } : x))
    setConfirmDeactivate(null)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.filter(u => u.activo).length} activos · {users.length} total</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-kof-red text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-kof-red-dark active:scale-95 transition-all shadow-sm shadow-kof-red/30">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Agregar usuario
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
          </svg>
          <input className="input-field pl-9 py-2 text-sm" placeholder="Buscar por nombre o correo..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field w-auto py-2 text-sm" value={filterRol} onChange={e => setFilterRol(e.target.value)}>
          <option value="todos">Todos los roles</option>
          <option value="executive">Executive</option>
          <option value="field">Field</option>
        </select>
        <select className="input-field w-auto py-2 text-sm" value={filterActivo} onChange={e => setFilterActivo(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Nombre</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Correo</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Rol</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Subrole</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Región</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">UO</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Estado</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-sm text-gray-400">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : filtered.map(user => (
                <tr
                  key={user.id}
                  onClick={() => user.rol === 'field' && navigate(`/admin/usuarios/${user.id}`)}
                  className={`hover:bg-gray-50/50 transition-colors ${user.rol === 'field' ? 'cursor-pointer' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-kof-red/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-kof-red">
                          {user.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </span>
                      </div>
                      <span className="font-medium text-gray-800">{user.nombre}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{user.correo}</td>
                  <td className="px-5 py-4">
                    <Badge variant={user.rol}>{user.rol}</Badge>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={user.subrole.toLowerCase()}>{user.subrole}</Badge>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{user.region}</td>
                  <td className="px-5 py-4 text-gray-500 max-w-[160px] truncate">{user.uo}</td>
                  <td className="px-5 py-4">
                    <Badge variant={user.activo ? 'active' : 'inactive'}>
                      {user.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); openEdit(user) }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeactivate(user) }}
                        className={`p-1.5 rounded-lg transition-colors ${user.activo ? 'text-gray-400 hover:text-kof-red hover:bg-red-50' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                        title={user.activo ? 'Desactivar' : 'Activar'}>
                        {user.activo ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modal === 'create' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Agregar usuario' : 'Editar usuario'}
        size="md"
      >
        <UserForm
          form={form}
          setForm={setForm}
          isEdit={modal === 'edit'}
          onSubmit={handleSubmit}
          onCancel={() => setModal(null)}
        />
      </Modal>

      {/* Confirm toggle modal */}
      <Modal
        open={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        title={confirmDeactivate?.activo ? 'Desactivar usuario' : 'Activar usuario'}
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-6">
          {confirmDeactivate?.activo
            ? `¿Desactivar a ${confirmDeactivate?.nombre}? No podrá iniciar sesión hasta que sea reactivado.`
            : `¿Activar a ${confirmDeactivate?.nombre}?`}
        </p>
        <div className="flex gap-3">
          <button onClick={() => setConfirmDeactivate(null)}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => toggleActivo(confirmDeactivate)}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all active:scale-95 ${confirmDeactivate?.activo ? 'bg-kof-red hover:bg-kof-red-dark' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            {confirmDeactivate?.activo ? 'Sí, desactivar' : 'Sí, activar'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
