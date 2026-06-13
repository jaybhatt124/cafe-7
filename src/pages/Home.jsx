import { Clock, Coffee, MapPin, MessageCircle, Phone, ShieldCheck, Sparkles, Trophy } from 'lucide-react'
import Feature from '../components/Feature'
import Info from '../components/Info'

export default function Home({ data, go }) {
  const { settings } = data

  return (
    <>
      <section className="hero">
        <div className="hero-copy reveal">
          <p className="eyebrow"><Trophy size={18} /> Box cricket under lights</p>
          <h1>Cafe 7</h1>
          <p className="hero-line">Book your turf slot, verify by email, confirm payment on WhatsApp, and let match night begin.</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => go('Booking')}>Book Now</button>
            <button className="ghost" onClick={() => go('Gallery')}>View Gallery</button>
          </div>
        </div>
        <div className="scoreboard reveal">
          <span>LIVE RATE</span>
          <strong>Rs.{settings.box_price}</strong>
          <small>per hour</small>
          <div className="score-row"><span>Green</span><b>Available</b></div>
          <div className="score-row pending"><span>Yellow</span><b>Pending</b></div>
          <div className="score-row booked"><span>Red</span><b>Booked</b></div>
        </div>
      </section>

      <section className="contact-strip">
        <Info icon={<Phone />} label="Call" value={settings.phone_number} />
        <Info icon={<MessageCircle />} label="WhatsApp" value={settings.whatsapp_number} />
        <Info icon={<MapPin />} label="Address" value={settings.address} />
      </section>

      <section className="section light">
        <div className="section-title">
          <p className="eyebrow dark">Why choose us</p>
          <h2>Fast booking, clean turf, match-ready nights.</h2>
        </div>
        <div className="feature-grid">
          <Feature icon={<Sparkles />} title="Floodlit Turf" text="Night games feel sharp with bright lights and a compact box-cricket setup." />
          <Feature icon={<Coffee />} title="Cafe Attached" text="Snacks, cold drinks, and post-match seating are right beside the ground." />
          <Feature icon={<ShieldCheck />} title="Verified Booking" text="Email OTP keeps booking requests cleaner and easier for admins to confirm." />
          <Feature icon={<Clock />} title="Live Slot Status" text="Green, yellow, and red slot states make availability easy to scan." />
        </div>
      </section>
    </>
  )
}
