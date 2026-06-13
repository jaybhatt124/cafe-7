import { useState } from 'react'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import Info from '../components/Info'
import { submitMessage } from '../services/dataService'

export default function Contact({ settings }) {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sent, setSent] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    await submitMessage(form)
    setSent(true)
    setForm({ name: '', email: '', message: '' })
  }

  return (
    <section className="section split">
      <div>
        <p className="eyebrow">Contact</p>
        <h2>Questions, group bookings, or payment details.</h2>
        <div className="info-stack">
          <Info icon={<Phone />} label="Phone" value={settings.phone_number} />
          <Info icon={<Mail />} label="Email" value={settings.email} />
          <Info icon={<MapPin />} label="Address" value={settings.address} />
          <Info icon={<Clock />} label="Timings" value={settings.timings} />
        </div>
      </div>
      <form className="panel form" onSubmit={submit}>
        <input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required type="email" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <textarea required placeholder="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        <button className="primary">Send Message</button>
        {sent && <p className="success">Message saved. Admin can review it in Firestore.</p>}
      </form>
      <iframe className="map" title="Cafe 7 map" src={settings.google_maps_link || 'https://maps.google.com'} loading="lazy" />
    </section>
  )
}
