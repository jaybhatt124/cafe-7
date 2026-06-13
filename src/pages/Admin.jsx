import { useEffect, useState } from 'react'
import { Lock, Search } from 'lucide-react'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth, firebaseReady } from '../firebase'
import { removeSlot, saveSettings, saveSlot, updateBookingStatus } from '../services/dataService'
import { sendApprovalEmail, sendRejectionEmail } from '../services/emailService'

const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@gmail.com'
const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'

export default function Admin({ data }) {
  const [admin, setAdmin] = useState(false)
  const [login, setLogin] = useState({ email: adminEmail, password: adminPassword })
  const [queryText, setQueryText] = useState('')
  const [settings, setSettings] = useState(data.settings)
  const [slotDraft, setSlotDraft] = useState('')
  const [notice, setNotice] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  useEffect(() => setSettings(data.settings), [data.settings])

  const loginAdmin = async (event) => {
    event.preventDefault()
    setNotice('')
    if (login.email !== adminEmail || login.password !== adminPassword) {
      setNotice('Use the predefined admin credentials.')
      return
    }
    setLoggingIn(true)
    try {
      if (firebaseReady && auth) await signInWithEmailAndPassword(auth, login.email, login.password)
      setAdmin(true)
      setNotice('Admin logged in. If bookings still do not show, check Firestore read rules for admin@gmail.com.')
    } catch (err) {
      console.warn('Admin Firebase login failed:', err)
      setNotice('Firebase admin login failed. Check Authentication user, Auth domain, and allowed domain.')
    } finally {
      setLoggingIn(false)
    }
  }

  const logoutAdmin = async () => {
    if (firebaseReady && auth) await signOut(auth)
    setAdmin(false)
  }

  const filteredBookings = data.bookings.filter((booking) =>
    [booking.customer_name, booking.mobile, booking.email, booking.booking_id, booking.booking_status]
      .join(' ')
      .toLowerCase()
      .includes(queryText.toLowerCase()),
  )

  const paidApproved = data.bookings.filter((booking) => booking.booking_status === 'Approved' && booking.payment_status === 'Paid')
  const today = new Date().toISOString().slice(0, 10)
  const month = today.slice(0, 7)
  const stats = [
    ['Today Income', paidApproved.filter((b) => b.booking_date === today).reduce((sum, b) => sum + Number(b.amount), 0)],
    ['Monthly Income', paidApproved.filter((b) => b.booking_date?.startsWith(month)).reduce((sum, b) => sum + Number(b.amount), 0)],
    ['Total Income', paidApproved.reduce((sum, b) => sum + Number(b.amount), 0)],
    ['Pending Requests', data.bookings.filter((b) => b.booking_status === 'Pending Approval').length],
  ]

  const addSlot = async () => {
    if (!slotDraft.trim()) return
    await saveSlot({ id: crypto.randomUUID(), slot_time: slotDraft, is_active: true, order: data.slots.length + 1 })
    setSlotDraft('')
  }

  const approve = async (booking) => {
    if (booking.payment_status !== 'Paid') {
      setNotice('Mark payment as Paid before approving.')
      return
    }
    await updateBookingStatus(booking, { booking_status: 'Approved' })
    await sendApprovalEmail({ to_email: booking.email, booking_id: booking.booking_id, booking_date: booking.booking_date, booking_slot: booking.booking_slot })
  }

  const reject = async (booking) => {
    await updateBookingStatus(booking, { booking_status: 'Rejected' })
    await sendRejectionEmail({ to_email: booking.email, booking_id: booking.booking_id })
  }

  if (!admin) {
    return (
      <section className="section admin-login">
        <form className="panel form narrow" onSubmit={loginAdmin}>
          <Lock size={34} />
          <h2>Admin Login</h2>
          <input type="email" value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} />
          <input type="password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} />
          <button className="primary" disabled={loggingIn}>{loggingIn ? 'Logging in...' : 'Login'}</button>
          {notice && <p className="error">{notice}</p>}
        </form>
      </section>
    )
  }

  return (
    <section className="section admin">
      <div className="admin-top">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Bookings, slots, price, and contact controls.</h2>
        </div>
        <button className="ghost" onClick={logoutAdmin}>Logout</button>
      </div>

      <div className="stat-grid">
        {stats.map(([label, value]) => (
          <div className="stat" key={label}><span>{label}</span><strong>{label.includes('Income') ? `Rs.${value}` : value}</strong></div>
        ))}
      </div>

      {notice && <p className="notice">{notice}</p>}

      <div className="admin-grid">
        <div className="panel wide">
          <div className="table-head">
            <h3>Booking Management</h3>
            <label className="search"><Search size={16} /><input placeholder="Search bookings" value={queryText} onChange={(e) => setQueryText(e.target.value)} /></label>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Customer</th><th>Date</th><th>Slot</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.booking_id}>
                    <td className="mono">{booking.booking_id}</td>
                    <td>{booking.customer_name}<small>{booking.mobile}</small></td>
                    <td>{booking.booking_date}</td>
                    <td>{booking.booking_slot}</td>
                    <td>
                      <button className="mini" onClick={() => updateBookingStatus(booking, { payment_status: booking.payment_status === 'Paid' ? 'Pending' : 'Paid' })}>
                        {booking.payment_status}
                      </button>
                    </td>
                    <td>{booking.booking_status}</td>
                    <td className="actions">
                      <button className="mini approve" onClick={() => approve(booking)}>Approve</button>
                      <button className="mini reject" onClick={() => reject(booking)}>Reject</button>
                    </td>
                  </tr>
                ))}
                {filteredBookings.length === 0 && (
                  <tr><td colSpan="7">No bookings found. If customers submitted bookings, check Firestore rules and admin login.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <h3>Settings</h3>
          <input value={settings.box_price} onChange={(e) => setSettings({ ...settings, box_price: Number(e.target.value) })} placeholder="Hourly price" />
          <input value={settings.phone_number} onChange={(e) => setSettings({ ...settings, phone_number: e.target.value })} placeholder="Phone" />
          <input value={settings.whatsapp_number} onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })} placeholder="WhatsApp" />
          <input value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} placeholder="Email" />
          <textarea value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} placeholder="Address" />
          <button className="primary" onClick={() => saveSettings(settings)}>Save Settings</button>
        </div>

        <div className="panel">
          <h3>Slot Management</h3>
          <div className="inline-form">
            <input value={slotDraft} onChange={(e) => setSlotDraft(e.target.value)} placeholder="10:00 PM - 11:00 PM" />
            <button className="primary" onClick={addSlot}>Add</button>
          </div>
          <div className="slot-list">
            {data.slots.map((slot) => (
              <div key={slot.id}>
                <span>{slot.slot_time}</span>
                <button className="mini" onClick={() => saveSlot({ ...slot, is_active: !slot.is_active })}>{slot.is_active ? 'Block' : 'Unblock'}</button>
                <button className="mini reject" onClick={() => removeSlot(slot.id)}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
