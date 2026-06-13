import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Menu, MessageCircle, X } from 'lucide-react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, firebaseReady } from './firebase'
import { seedDefaultsIfNeeded, subscribeCafeData } from './services/dataService'
import Home from './pages/Home'
import About from './pages/About'
import Gallery from './pages/Gallery'
import Contact from './pages/Contact'
import Booking from './pages/Booking'
import Admin from './pages/Admin'
import './styles.css'

const pages = {
  '/': 'Home',
  '/about': 'About',
  '/gallery': 'Gallery',
  '/contact': 'Contact',
  '/booking': 'Booking',
  '/admin': 'Admin',
}

const pagePaths = Object.fromEntries(Object.entries(pages).map(([path, page]) => [page, path]))

const navItems = [
  { label: 'Home', page: 'Home' },
  { label: 'About Us', page: 'About' },
  { label: 'Gallery', page: 'Gallery' },
  { label: 'Contact Us', page: 'Contact' },
  { label: 'Booking', page: 'Booking' },
]

function App() {
  const [activePage, setActivePage] = useState(() => pages[window.location.pathname] || 'Home')
  const [menuOpen, setMenuOpen] = useState(false)
  const [data, setData] = useState(null)
  const [authUser, setAuthUser] = useState(null)

  useEffect(() => {
    seedDefaultsIfNeeded().catch((error) => {
      console.warn('Firebase default seed skipped:', error)
    })
  }, [])

  useEffect(() => {
    if (!firebaseReady || !auth) return undefined
    return onAuthStateChanged(auth, setAuthUser)
  }, [])

  useEffect(() => subscribeCafeData(setData), [authUser])

  useEffect(() => {
    const syncPage = () => setActivePage(pages[window.location.pathname] || 'Home')
    window.addEventListener('popstate', syncPage)
    return () => window.removeEventListener('popstate', syncPage)
  }, [])

  if (!data) return <div className="boot">Cafe 7 scoreboard warming up...</div>

  const settings = data.settings || {}

  const changePage = (page) => {
    const path = pagePaths[page] || '/'
    if (window.location.pathname !== path) window.history.pushState({}, '', path)
    setActivePage(page)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <header className="site-header">
        <button className="brand" onClick={() => changePage('Home')} aria-label="Cafe 7 home">
          <span className="brand-mark">7</span>
          <span>
            <strong>Cafe 7</strong>
            <small>Box Cricket Turf</small>
          </span>
        </button>
        <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav className={menuOpen ? 'open' : ''}>
          {navItems.map((item) => (
            <button className={activePage === item.page ? 'active' : ''} key={item.page} onClick={() => changePage(item.page)}>
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {activePage === 'Home' && <Home data={data} go={changePage} />}
        {activePage === 'About' && <About />}
        {activePage === 'Gallery' && <Gallery />}
        {activePage === 'Contact' && <Contact settings={settings} />}
        {activePage === 'Booking' && <Booking data={data} />}
        {activePage === 'Admin' && <Admin data={data} />}
      </main>

      <a
        className="whatsapp-float"
        href={`https://wa.me/${settings.whatsapp_number || ''}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle size={24} />
      </a>

      <footer>
        <div>
          <strong>Cafe 7</strong>
          <span>Floodlit turf, cafe energy, serious match nights.</span>
        </div>
        <div>{settings.phone_number} | {settings.email}</div>
      </footer>
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
