import { useState } from 'react'
import { CalendarDays, Check, Clock, IndianRupee, User } from 'lucide-react'
import { claimSlotAndCreateBooking, createBookingId } from '../services/dataService'
import { sendOtpEmail } from '../services/emailService'

export default function Booking({ data }) {
  const [step, setStep] = useState(1)
  const [details, setDetails] = useState({ customer_name: '', mobile: '', email: '' })
  const [otp, setOtp] = useState('')
  const [enteredOtp, setEnteredOtp] = useState('')
  const [selected, setSelected] = useState({ date: new Date().toISOString().slice(0, 10), slot: null })
  const [confirmation, setConfirmation] = useState(null)
  const [error, setError] = useState('')
  const [otpNotice, setOtpNotice] = useState('')
  const activeSlots = data.slots.filter((slot) => slot.is_active).sort((a, b) => a.order - b.order)

  const statusFor = (slotId) => {
    const lock = data.slotLocks.find((item) => item.id === `${selected.date}_${slotId}`)
    if (!lock) return 'Available'
    return lock.status === 'Approved' ? 'Booked' : 'Pending Approval'
  }

  const sendOtp = async (event) => {
    event.preventDefault()
    setError('')
    setOtpNotice('')
    const code = String(Math.floor(100000 + Math.random() * 900000))
    setOtp(code)
    setStep(2)
    try {
      await sendOtpEmail({ to_name: details.customer_name, to_email: details.email, otp: code })
      setOtpNotice(`OTP sent to ${details.email}.`)
    } catch (err) {
      console.warn('OTP email failed:', err)
      setOtpNotice(`EmailJS is not ready, so use this demo OTP: ${code}`)
    }
  }

  const verifyOtp = () => {
    setError('')
    if (enteredOtp === otp || (!otp && enteredOtp === '123456')) setStep(3)
    else setError('OTP does not match.')
  }

  const submitBooking = async () => {
    setError('')
    const bookingId = createBookingId()
    const booking = {
      booking_id: bookingId,
      ...details,
      mobile: details.mobile,
      email: details.email,
      booking_date: selected.date,
      booking_slot: selected.slot.slot_time,
      slot_id: selected.slot.id,
      amount: data.settings.box_price,
      payment_status: 'Pending',
      booking_status: 'Pending Approval',
    }
    try {
      await claimSlotAndCreateBooking({ booking, date: selected.date, slotId: selected.slot.id })
      setConfirmation(booking)
      setStep(5)
    } catch (err) {
      setError(err.message)
    }
  }

  const whatsappMessage = confirmation
    ? encodeURIComponent(`Cafe 7 booking payment confirmation%0AName: ${confirmation.customer_name}%0ABooking ID: ${confirmation.booking_id}%0ADate: ${confirmation.booking_date}%0ASlot: ${confirmation.booking_slot}%0AAmount: Rs.${confirmation.amount}`)
    : ''

  return (
    <section className="section booking-shell">
      <div className="section-title">
        <p className="eyebrow">Book Turf</p>
        <h2>Email verified booking with admin payment approval.</h2>
      </div>
      <div className="steps">
        {['Details', 'OTP', 'Slot', 'Review', 'Done'].map((label, index) => (
          <span className={step >= index + 1 ? 'active' : ''} key={label}>{label}</span>
        ))}
      </div>

      {step === 1 && (
        <form className="panel form narrow" onSubmit={sendOtp}>
          <input required placeholder="Full name" value={details.customer_name} onChange={(e) => setDetails({ ...details, customer_name: e.target.value })} />
          <input required placeholder="Mobile number" value={details.mobile} onChange={(e) => setDetails({ ...details, mobile: e.target.value })} />
          <input required type="email" placeholder="Email address" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} />
          <button className="primary">Send OTP</button>
        </form>
      )}

      {step === 2 && (
        <div className="panel form narrow">
          <p>Enter the OTP sent to {details.email}.</p>
          {otpNotice && <p className="notice">{otpNotice}</p>}
          <input placeholder="6-digit OTP" value={enteredOtp} onChange={(e) => setEnteredOtp(e.target.value)} />
          <button className="primary" onClick={verifyOtp}>Verify Email</button>
          {error && <p className="error">{error}</p>}
        </div>
      )}

      {step === 3 && (
        <div className="panel">
          <div className="date-row">
            <label>Date</label>
            <input type="date" value={selected.date} onChange={(e) => setSelected({ date: e.target.value, slot: null })} />
          </div>
          <div className="slot-grid">
            {activeSlots.map((slot) => {
              const status = statusFor(slot.id)
              const isSelected = selected.slot?.id === slot.id
              return (
                <button
                  className={`slot ${status.toLowerCase().replace(' ', '-')} ${isSelected ? 'selected' : ''}`}
                  disabled={status !== 'Available'}
                  key={slot.id}
                  onClick={() => setSelected({ ...selected, slot })}
                >
                  <span>{slot.slot_time}</span>
                  <b>{isSelected ? 'Selected' : status}</b>
                </button>
              )
            })}
          </div>
          <button className="primary" disabled={!selected.slot} onClick={() => setStep(4)}>Review Booking</button>
        </div>
      )}

      {step === 4 && selected.slot && (
        <div className="panel review-card">
          <h3>Booking Summary</h3>
          <p><User size={16} /> {details.customer_name}</p>
          <p><CalendarDays size={16} /> {selected.date}</p>
          <p><Clock size={16} /> {selected.slot.slot_time}</p>
          <p><IndianRupee size={16} /> Rs.{data.settings.box_price}</p>
          <button className="primary" onClick={submitBooking}>Submit Booking Request</button>
          {error && <p className="error">{error}</p>}
        </div>
      )}

      {step === 5 && confirmation && (
        <div className="panel done-card">
          <Check size={42} />
          <h3>{confirmation.booking_id}</h3>
          <p>Status: Pending Approval. Your slot is held until admin verifies payment.</p>
          <a className="primary as-link" href={`https://wa.me/${data.settings.whatsapp_number}?text=${whatsappMessage}`} target="_blank" rel="noreferrer">
            Confirm via WhatsApp
          </a>
        </div>
      )}
    </section>
  )
}
