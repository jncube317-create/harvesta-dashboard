import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import {
  Cloud, Droplets, Thermometer, Leaf, Home, Layout, TrendingUp,
  Calendar, Settings, MapPin, Camera, Bug, Sprout, Loader2,
  ChevronRight, Plus, DollarSign, ShoppingCart, BarChart3,
  Package, Trash2, Edit2, X, Check, LogOut, UserPlus, Users, Clock, Mail, Key, Image as ImageIcon
} from 'lucide-react'

// Icon Mapping
const IconMap = {
  cloud: <Cloud size={20} />,
  droplets: <Droplets size={20} />,
  thermometer: <Thermometer size={20} />,
  leaf: <Leaf size={20} />,
  Overview: <Home size={20} />,
  Crops: <Leaf size={20} />,
  Salaries: <DollarSign size={20} />,
  Purchases: <ShoppingCart size={20} />,
  Sales: <BarChart3 size={20} />,
  Stocks: <Package size={20} />,
  Settings: <Settings size={20} />,
  Admin: <Users size={20} />
}

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [signupRole, setSignupRole] = useState('editor')

  const [activeTab, setActiveTab] = useState('Overview')
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState([])
  const [activities, setActivities] = useState([])
  const [projections, setProjections] = useState([])
  const [crops, setCrops] = useState([])
  const [salaries, setSalaries] = useState([])
  const [purchases, setPurchases] = useState([])
  const [sales, setSales] = useState([])
  const [stocks, setStocks] = useState([])
  const [invites, setInvites] = useState([])
  const [avatarUrl, setAvatarUrl] = useState(null)

  // Modal States
  const [editingItem, setEditingItem] = useState(null) // { table, item }
  const [isCreating, setIsCreating] = useState(null) // table name: 'salaries', 'purchases', etc.
  const [formLoading, setFormLoading] = useState(false)

  // Invitation States
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('editor')
  const [inviteExpiry, setInviteExpiry] = useState('7')

  const fileInputRef = useRef(null)
  const receiptInputRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchProfile(session.user.id)
        setAuthMode('login')
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      fetchData()
      loadAvatar()
    }
  }, [session])

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      let res
      if (authMode === 'login') {
        res = await supabase.auth.signInWithPassword({ email, password })
      } else if (authMode === 'signup') {
        res = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: signupRole,
              full_name: fullName
            }
          }
        })
      } else if (authMode === 'recovery') {
        res = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        })
        if (!res.error) alert('Password reset link sent! Check your email.')
      }

      if (res.error) {
        alert(res.error.message)
      } else if (authMode === 'signup' && res.data?.user && !res.data.session) {
        alert('Verification email sent! Please check your inbox.')
      }
    } catch (err) {
      alert('Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => supabase.auth.signOut()

  const fetchData = async () => {
    setLoading(true)
    try {
      const [m, a, p, c, s, pur, sal, sto, inv] = await Promise.all([
        supabase.from('metrics').select('*').order('created_at', { ascending: true }),
        supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('harvest_projections').select('*').order('sort_order', { ascending: true }),
        supabase.from('crops').select('*').order('planting_date', { ascending: false }),
        supabase.from('salaries').select('*').order('employee_name', { ascending: true }),
        supabase.from('purchases').select('*').order('purchase_date', { ascending: false }),
        supabase.from('sales').select('*').order('sale_date', { ascending: false }),
        supabase.from('stocks').select('*').order('item_name', { ascending: true }),
        supabase.from('invitations').select('*').order('created_at', { ascending: false })
      ])

      setMetrics(m.data || [])
      setActivities(a.data || [])
      setProjections(p.data || [])
      setCrops(c.data || [])
      setSalaries(s.data || [])
      setPurchases(pur.data || [])
      setSales(sal.data || [])
      setStocks(sto.data || [])
      setInvites(inv.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendInvite = async (e) => {
    e.preventDefault()
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + parseInt(inviteExpiry))

    const { error } = await supabase.from('invitations').insert({
      email: inviteEmail,
      invited_by: session.user.id,
      role: inviteRole,
      expires_at: expiryDate.toISOString()
    })

    if (error) alert(error.message)
    else {
      alert('Invitation sent successfully!')
      setInviteEmail('')
      fetchData()
    }
  }

  const loadAvatar = async () => {
    const { data } = supabase.storage.from('avatars').getPublicUrl('profile_pic.png')
    if (data) setAvatarUrl(data.publicUrl)
  }

  const handleUpdateMetric = async (id, newValue) => {
    const { error } = await supabase.from('metrics').update({ value: newValue }).eq('id', id)
    if (!error) fetchData()
    setEditingItem(null)
  }

  const handleUpdateTable = async (table, id, updates) => {
    const { error } = await supabase.from(table).update(updates).eq('id', id)
    if (!error) fetchData()
    setEditingItem(null)
  }

  const handleDeleteItem = async (table, id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (!error) fetchData()
  }

  const handleCreateRecord = async (table, data) => {
    setFormLoading(true)
    const { error } = await supabase.from(table).insert([data])
    setFormLoading(false)
    if (error) alert(error.message)
    else {
      setIsCreating(null)
      fetchData()
    }
  }

  const handleFileUpload = async (e, bucket, fileName) => {
    const file = e.target.files[0]
    if (!file) return

    setFormLoading(true)
    const { error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true })
    setFormLoading(false)

    if (error) {
      alert(error.message)
      return null
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)
    return data?.publicUrl
  }

  const renderModal = () => {
    if (!editingItem && !isCreating) return null

    const table = editingItem?.table || isCreating
    const item = editingItem?.item || {}
    const isEdit = !!editingItem

    return (
      <div className="modal-overlay" onClick={() => { setEditingItem(null); setIsCreating(null); }}>
        <div className="glass modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{isEdit ? 'Edit' : 'Add New'} {table.charAt(0).toUpperCase() + table.slice(1)}</h3>
            <button onClick={() => { setEditingItem(null); setIsCreating(null); }} className="close-btn"><X size={20} /></button>
          </div>
          <div className="modal-body">
            <form onSubmit={async (e) => {
              e.preventDefault()
              const formData = new FormData(e.target)
              const data = Object.fromEntries(formData.entries())

              setFormLoading(true)
              if (isEdit) {
                await handleUpdateTable(table, item.id, data)
              } else {
                await handleCreateRecord(table, data)
              }
              setFormLoading(false)
            }}>

              {table === 'salaries' && (
                <>
                  <div className="form-group">
                    <label>Employee Name</label>
                    <input name="employee_name" type="text" defaultValue={item.employee_name} required placeholder="John Doe" />
                  </div>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Role</label>
                    <input name="role" type="text" defaultValue={item.role} required placeholder="Field Worker" />
                  </div>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Amount (USD)</label>
                    <input name="amount" type="number" step="0.01" defaultValue={item.amount} required />
                  </div>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Status</label>
                    <select name="status" defaultValue={item.status || 'Unpaid'}>
                      <option>Paid</option>
                      <option>Unpaid</option>
                      <option>Partial</option>
                    </select>
                  </div>
                </>
              )}

              {table === 'purchases' && (
                <>
                  <div className="form-group">
                    <label>Item Name</label>
                    <input name="item_name" type="text" defaultValue={item.item_name} required placeholder="Fertilizer Type A" />
                  </div>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Category</label>
                    <select name="category" defaultValue={item.category || 'Supplies'}>
                      <option>Seeds</option>
                      <option>Fertilizer</option>
                      <option>Chemicals</option>
                      <option>Equipment</option>
                      <option>Supplies</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Total Price (USD)</label>
                    <input name="total_price" type="number" step="0.01" defaultValue={item.total_price} required />
                  </div>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Purchase Date</label>
                    <input name="purchase_date" type="date" defaultValue={item.purchase_date || new Date().toISOString().split('T')[0]} required />
                  </div>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Receipt Photo</label>
                    <div className="upload-placeholder clickable" onClick={() => receiptInputRef.current.click()}>
                      <Camera size={24} />
                      <span>{item.receipt_url ? 'Change Receipt' : 'Take or Upload Pic'}</span>
                      <input
                        type="file"
                        ref={receiptInputRef}
                        hidden
                        accept="image/*"
                        onChange={async (e) => {
                          const url = await handleFileUpload(e, 'receipts', `receipt_${Date.now()}.png`)
                          if (url) {
                            const input = document.createElement('input')
                            input.type = 'hidden'
                            input.name = 'receipt_url'
                            input.value = url
                            e.target.parentNode.appendChild(input)
                            alert('Receipt ready for upload!')
                          }
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              {table === 'sales' && (
                <>
                  <div className="form-group">
                    <label>Crop Name</label>
                    <input name="crop_name" type="text" defaultValue={item.crop_name} required placeholder="Strawberries" />
                  </div>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Quantity</label>
                    <input name="quantity" type="text" defaultValue={item.quantity} required placeholder="500 kg" />
                  </div>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Total Revenue (USD)</label>
                    <input name="total_revenue" type="number" step="0.01" defaultValue={item.total_revenue} required />
                  </div>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Sale Date</label>
                    <input name="sale_date" type="date" defaultValue={item.sale_date || new Date().toISOString().split('T')[0]} required />
                  </div>
                </>
              )}

              {table === 'stocks' && (
                <>
                  <div className="form-group">
                    <label>Item Name</label>
                    <input name="item_name" type="text" defaultValue={item.item_name} required placeholder="Irrigation Pipes" />
                  </div>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Quantity</label>
                    <input name="quantity" type="number" defaultValue={item.quantity} required />
                  </div>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Unit</label>
                    <input name="unit" type="text" defaultValue={item.unit} required placeholder="m / bags / bottles" />
                  </div>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>Min Stock Level</label>
                    <input name="min_stock_level" type="number" defaultValue={item.min_stock_level} required />
                  </div>
                </>
              )}

              <button type="submit" className="btn-primary" disabled={formLoading} style={{ width: '100%', marginTop: '2rem' }}>
                {formLoading ? <Loader2 className="animate-spin" size={20} /> : (isEdit ? 'Save Changes' : 'Create Record')}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  const renderAuthScreen = () => (
    <div className="auth-overlay">
      <div className="glass auth-card">
        <div className="logo-section" style={{ justifyContent: 'center' }}>
          <div className="logo-icon"><Sprout color="white" /></div>
          <h1 style={{ color: 'var(--forest-green)' }}>Harvesta</h1>
        </div>

        <h2 style={{ marginTop: '1.2rem' }}>
          {authMode === 'login' ? 'Welcome Back' : authMode === 'signup' ? 'Join the Farm' : 'Password Recovery'}
        </h2>
        <p style={{ marginBottom: '1rem', color: '#667085' }}>
          {authMode === 'login' ? 'Enter your credentials to manage your crops.' : authMode === 'signup' ? 'Register your account to start farming.' : 'Enter your email to receive a recovery link.'}
        </p>

        <form onSubmit={handleAuth} className="auth-form">
          {authMode === 'signup' && (
            <div className="fade-in">
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Jethro Farmer" />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Role</label>
                <select value={signupRole} onChange={e => setSignupRole(e.target.value)}>
                  <option value="admin">Administrator (Owner)</option>
                  <option value="editor">Department Member (Staff)</option>
                </select>
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginTop: authMode === 'signup' ? '1rem' : '0' }}>
            <label>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="farmer@jethro.com" />
          </div>

          {authMode !== 'recovery' && (
            <div className="form-group" style={{ marginTop: '1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Password</label>
                {authMode === 'login' && (
                  <button type="button" className="text-btn" onClick={() => setAuthMode('recovery')} style={{ fontSize: '0.8rem' }}>Forgot?</button>
                )}
              </div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '2.5rem' }}>
            {loading ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Loader2 className="animate-spin" size={20} /> Processing...</div> :
              (authMode === 'login' ? 'Sign In to Dashboard' : authMode === 'signup' ? 'Register Account' : 'Send Recovery Email')}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          {authMode === 'login' ? (
            <>
              <p style={{ fontSize: '0.9rem', color: '#667085' }}>New to the platform?</p>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setAuthMode('signup')}>Create Professional Account</button>
            </>
          ) : authMode === 'signup' ? (
            <>
              <p style={{ fontSize: '0.9rem', color: '#667085' }}>Already registered?</p>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setAuthMode('login')}>Sign In to Dashboard</button>
            </>
          ) : (
            <button className="text-btn" onClick={() => setAuthMode('login')}>Back to Login</button>
          )}
        </div>
      </div>
    </div>
  )

  const renderOverview = () => (
    <>
      <section className="metrics-grid">
        {metrics.map((m) => (
          <div key={m.id} className="glass metric-card clickable" onClick={() => setEditingItem({ table: 'metrics', item: m })}>
            <div className={`metric-icon metric-icon-${m.icon}`}>
              {IconMap[m.icon]}
            </div>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">{m.value}</div>
            <div className={`tag tag-${m.tag_type}`}>{m.tag}</div>
            <div className="edit-hint"><Edit2 size={12} /> Adjust</div>
          </div>
        ))}
      </section>

      <section className="chart-section">
        <div className="glass chart-card">
          <h3 style={{ marginBottom: '1.5rem' }}>Harvest Projection</h3>
          <div style={{ height: '280px', width: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 20px' }}>
            {projections.map((p) => (
              <div key={p.id} className="chart-bar" style={{ height: `${p.projection_value}%` }}>
                <div className="bar-tooltip">{p.projection_value}%</div>
              </div>
            ))}
          </div>
          <div className="chart-labels">
            {projections.map(p => <span key={p.id}>{p.day}</span>)}
          </div>
        </div>

        <div className="glass activity-card">
          <h3>Recent Activities</h3>
          <div className="activity-list">
            {activities.map(a => (
              <div key={a.id} className="activity-item">
                <div className="activity-dot" style={{ background: a.dot_color }}></div>
                <div>
                  <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>{a.description}</div>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>{a.time_ago}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )

  const renderFinancialTable = (title, data, tableType) => (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>{title}</h2>
        <button className="glass btn-primary" onClick={() => setIsCreating(tableType)}><Plus size={18} /> Add Record</button>
      </div>
      <div className="glass table-container">
        <table>
          <thead>
            <tr>
              {tableType === 'salaries' && <><th>Employee</th><th>Role</th><th>Amount</th><th>Status</th></>}
              {tableType === 'purchases' && <><th>Item</th><th>Category</th><th>Total</th><th>Receipt</th></>}
              {tableType === 'sales' && <><th>Crop</th><th>Quantity</th><th>Revenue</th><th>Date</th></>}
              {tableType === 'stocks' && <><th>Item</th><th>Quantity</th><th>Unit</th><th>Level</th></>}
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id}>
                {tableType === 'salaries' && (
                  <>
                    <td>{item.employee_name}</td>
                    <td>{item.role}</td>
                    <td className="bold">${item.amount}</td>
                    <td><span className={`tag tag-${item.status.toLowerCase() === 'paid' ? 'success' : 'warning'}`}>{item.status}</span></td>
                  </>
                )}
                {tableType === 'purchases' && (
                  <>
                    <td>{item.item_name}</td>
                    <td>{item.category}</td>
                    <td className="bold">${item.total_price}</td>
                    <td>
                      {item.receipt_url ? (
                        <a href={item.receipt_url} target="_blank" className="receipt-link"><ImageIcon size={16} /> View</a>
                      ) : <span style={{ color: '#ccc', fontSize: '0.8rem' }}>No Pic</span>}
                    </td>
                  </>
                )}
                {tableType === 'sales' && (
                  <>
                    <td>{item.crop_name}</td>
                    <td>{item.quantity}</td>
                    <td className="bold text-success">${item.total_revenue}</td>
                    <td>{new Date(item.sale_date).toLocaleDateString()}</td>
                  </>
                )}
                {tableType === 'stocks' && (
                  <>
                    <td>{item.item_name}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unit}</td>
                    <td><span className={`tag tag-${item.quantity > item.min_stock_level ? 'success' : 'warning'}`}>
                      {item.quantity > item.min_stock_level ? 'Good' : 'Low'}
                    </span></td>
                  </>
                )}
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="icon-btn" onClick={() => setEditingItem({ table: tableType, item })}><Edit2 size={14} /></button>
                    <button className="icon-btn delete" onClick={() => handleDeleteItem(tableType, item.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderCrops = () => (
    <div className="crops-view fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Crop Management Portfolio</h2>
        <div className="glass search-bar">
          <input type="text" placeholder="Search cultivars..." />
        </div>
      </div>
      <div className="crops-grid">
        {crops.map(crop => (
          <div key={crop.id} className="glass crop-card luxury">
            <div className="crop-img-container">
              <img src={crop.image_url || `https://images.unsplash.com/photo-1598214886806-c87b84b7098b?w=400&h=250&fit=crop`} alt={crop.name} />
              <div className="crop-status-overlay">
                <span className={`tag tag-${crop.pest_status === 'Low' ? 'success' : 'warning'}`}>{crop.status}</span>
              </div>
            </div>
            <div className="crop-content">
              <h3>{crop.name} <span className="variety">({crop.variety})</span></h3>
              <p className="crop-desc">{crop.description}</p>

              <div className="crop-meta">
                <div className="meta-row">
                  <Calendar size={14} /> <span>Planted: <b>{new Date(crop.planting_date).toLocaleDateString()}</b></span>
                </div>
                <div className="meta-row">
                  <Bug size={14} /> <span>Pests: <b className={crop.pest_status !== 'Low' ? 'warning-text' : ''}>{crop.pests?.join(', ')}</b></span>
                </div>
              </div>

              <div className="crop-footer-luxury">
                <div className="progress-group">
                  <div className="progress-label">Growth Cycle</div>
                  <div className="progress-bar-luxury"><div className="fill" style={{ width: '65%' }}></div></div>
                </div>
                <button className="glass details-btn">Details <ChevronRight size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderAdminSettings = () => (
    <div className="admin-panel fade-in">
      <h3>Governance & Access Control</h3>
      <div className="glass invite-form-card">
        <form onSubmit={handleSendInvite} className="invite-form">
          <div className="form-row">
            <div className="form-group flex-1">
              <label>Invite by Email</label>
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required placeholder="collaborator@farm.com" />
            </div>
            <div className="form-group">
              <label>Privilege Level</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                <option value="editor">Editor (Modify Data)</option>
                <option value="admin">Administrator (Full Control)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Access Duration</label>
              <select value={inviteExpiry} onChange={e => setInviteExpiry(e.target.value)}>
                <option value="1">24 Hours</option>
                <option value="7">7 Days</option>
                <option value="30">30 Days</option>
                <option value="365">1 Year</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '1.5rem' }}>
            <UserPlus size={18} /> Deploy Invitation
          </button>
        </form>
      </div>

      <h4 style={{ marginTop: '2.5rem', marginBottom: '1.2rem' }}>Pending Invitations</h4>
      <div className="glass invite-list-card">
        {invites.length === 0 ? <p style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>No pending access requests.</p> : (
          <div className="table-container" style={{ padding: 0 }}>
            <table className="mini-table">
              <thead>
                <tr><th>Email Address</th><th>Role</th><th>Expires On</th><th>Status</th></tr>
              </thead>
              <tbody>
                {invites.map(inv => (
                  <tr key={inv.id}>
                    <td>{inv.email}</td>
                    <td><span className="tag" style={{ background: '#f0f0f0' }}>{inv.role}</span></td>
                    <td>{new Date(inv.expires_at).toLocaleDateString()}</td>
                    <td><span className={`tag tag-${inv.status}`}>{inv.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )

  if (!session && !loading) return renderAuthScreen()

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div>
          <div className="logo-section">
            <div className="logo-icon"><Sprout color="white" /></div>
            <h1>Harvesta</h1>
          </div>
          <nav className="nav-links">
            {['Overview', 'Crops', 'Salaries', 'Purchases', 'Sales', 'Stocks', 'Settings'].map(tab => (
              <li
                key={tab}
                className={`nav-item ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {IconMap[tab]}
                {tab}
              </li>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-profile">
            <img src={avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop'} alt="User" />
            <div className="profile-info">
              <p className="name">{profile?.full_name || 'User'}</p>
              <p className="role">{profile?.role?.toUpperCase() || 'MEMBER'}</p>
            </div>
            <div className="online-dot"></div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Terminate Session">
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="header-info">
            <h1>{activeTab} Dashboard</h1>
            <p>Managed agricultural operations & high-fidelity monitoring.</p>
          </div>
          <div className="glass location-pill">
            <MapPin size={16} /> Mashonaland West, ZW
          </div>
        </header>

        {loading ? (
          <div className="loader-container">
            <Loader2 className="animate-spin" size={40} color="var(--emerald)" />
            <p>Gathering farm data from Supabase...</p>
          </div>
        ) : (
          <div className="content-area">
            {activeTab === 'Overview' && renderOverview()}
            {activeTab === 'Crops' && renderCrops()}
            {activeTab === 'Salaries' && renderFinancialTable('Salaries & Wages', salaries, 'salaries')}
            {activeTab === 'Purchases' && renderFinancialTable('Farm Purchases', purchases, 'purchases')}
            {activeTab === 'Sales' && renderFinancialTable('Harvest Sales', sales, 'sales')}
            {activeTab === 'Stocks' && renderFinancialTable('Inventory & Stocks', stocks, 'stocks')}
            {activeTab === 'Settings' && (
              <div className="settings-view fade-in">
                <h2>System Configuration</h2>
                <div className="glass settings-card">
                  <div className="profile-edit">
                    <div className="avatar-wrapper">
                      <img src={avatarUrl || 'https://via.placeholder.com/150'} alt="Profile" />
                      <button className="upload-btn" onClick={() => fileInputRef.current.click()}><Camera size={18} /></button>
                      <input type="file" ref={fileInputRef} hidden onChange={async (e) => {
                        const url = await handleFileUpload(e, 'avatars', 'profile_pic.png')
                        if (url) setAvatarUrl(url)
                      }} />
                    </div>
                    <div className="text-info">
                      <h3>{profile?.full_name || 'Jethro Farmer'}</h3>
                      <p>{profile?.email}</p>
                      <p className="tag tag-success" style={{ marginTop: '0.5rem' }}>{profile?.role?.toUpperCase()}</p>
                    </div>
                  </div>
                </div>

                {profile?.role === 'admin' && renderAdminSettings()}
              </div>
            )}
          </div>
        )}
      </main>
      {renderModal()}
    </div>
  )
}

export default App
