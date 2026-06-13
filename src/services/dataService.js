import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, firebaseReady } from '../firebase'

const STORAGE_KEY = 'cafe7_demo_data'

const defaultData = {
  settings: {
    box_price: 1200,
    whatsapp_number: import.meta.env.VITE_WHATSAPP_NUMBER || '919999999999',
    phone_number: '+91 99999 99999',
    email: 'hello@cafe7.in',
    address: 'Cafe 7 Box Cricket Turf, Main Road, Your City',
    google_maps_link: 'https://maps.google.com',
    timings: '6:00 AM - 12:00 AM',
  },
  slots: [
    { id: 's1', slot_time: '06:00 AM - 07:00 AM', is_active: true, order: 1 },
    { id: 's2', slot_time: '07:00 AM - 08:00 AM', is_active: true, order: 2 },
    { id: 's3', slot_time: '08:00 AM - 09:00 AM', is_active: true, order: 3 },
    { id: 's4', slot_time: '06:00 PM - 07:00 PM', is_active: true, order: 4 },
    { id: 's5', slot_time: '07:00 PM - 08:00 PM', is_active: true, order: 5 },
    { id: 's6', slot_time: '08:00 PM - 09:00 PM', is_active: true, order: 6 },
    { id: 's7', slot_time: '09:00 PM - 10:00 PM', is_active: true, order: 7 },
  ],
  bookings: [],
  slotLocks: [],
  blockedDates: [],
  messages: [],
}

const readLocal = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData))
    return defaultData
  }
  return JSON.parse(saved)
}

const writeLocal = (next) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event('cafe7-data-change'))
}

export const createBookingId = () =>
  `C7-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`

export const subscribeCafeData = (callback) => {
  if (!firebaseReady) {
    callback(readLocal())
    const sync = () => callback(readLocal())
    window.addEventListener('cafe7-data-change', sync)
    return () => window.removeEventListener('cafe7-data-change', sync)
  }

  const unsubscribers = []
  const state = {
    settings: defaultData.settings,
    slots: defaultData.slots,
    bookings: [],
    slotLocks: [],
    blockedDates: [],
    messages: [],
  }
  const emit = () => callback({ ...state })
  emit()

  const handleSnapshotError = (error) => {
    console.warn('Firebase realtime sync unavailable. Showing default/demo data.', error)
    emit()
  }

  unsubscribers.push(onSnapshot(
    doc(db, 'settings', 'main'),
    (snap) => {
      state.settings = snap.exists() ? snap.data() : defaultData.settings
      emit()
    },
    handleSnapshotError,
  ))
  ;['slots', 'bookings', 'slotLocks', 'blockedDates', 'messages'].forEach((name) => {
    const q = name === 'slots' ? query(collection(db, name), orderBy('order')) : collection(db, name)
    unsubscribers.push(onSnapshot(
      q,
      (snap) => {
        const entries = snap.docs.map((entry) => ({ id: entry.id, ...entry.data() }))
        state[name] = name === 'slots' && entries.length === 0 ? defaultData.slots : entries
        emit()
      },
      handleSnapshotError,
    ))
  })

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
}

export const seedDefaultsIfNeeded = async () => {
  if (!firebaseReady) return
  const slots = await getDocs(collection(db, 'slots'))
  if (slots.empty) {
    await Promise.all(defaultData.slots.map((slot) => setDoc(doc(db, 'slots', slot.id), slot)))
  }
  await setDoc(doc(db, 'settings', 'main'), defaultData.settings, { merge: true })
}

export const submitMessage = async (payload) => {
  if (!firebaseReady) {
    const data = readLocal()
    data.messages.unshift({ id: crypto.randomUUID(), ...payload, created_at: new Date().toISOString() })
    writeLocal(data)
    return
  }
  await addDoc(collection(db, 'messages'), { ...payload, created_at: serverTimestamp() })
}

export const claimSlotAndCreateBooking = async ({ booking, date, slotId }) => {
  const lockId = `${date}_${slotId}`
  if (!firebaseReady) {
    const data = readLocal()
    if (data.slotLocks.some((lock) => lock.id === lockId && ['Pending Approval', 'Approved'].includes(lock.status))) {
      throw new Error('This slot was just taken. Pick another slot.')
    }
    data.slotLocks.push({ id: lockId, booking_date: date, slot_id: slotId, booking_ref: booking.booking_id, status: 'Pending Approval' })
    data.bookings.unshift({ ...booking, id: booking.booking_id, created_at: new Date().toISOString() })
    writeLocal(data)
    return booking.booking_id
  }

  await runTransaction(db, async (transaction) => {
    const lockRef = doc(db, 'slotLocks', lockId)
    const lockSnap = await transaction.get(lockRef)
    if (lockSnap.exists() && ['Pending Approval', 'Approved'].includes(lockSnap.data().status)) {
      throw new Error('This slot was just taken. Pick another slot.')
    }
    const bookingRef = doc(db, 'bookings', booking.booking_id)
    transaction.set(lockRef, { booking_date: date, slot_id: slotId, booking_ref: booking.booking_id, status: 'Pending Approval' })
    transaction.set(bookingRef, { ...booking, created_at: serverTimestamp() })
  })
  return booking.booking_id
}

export const updateBookingStatus = async (booking, updates) => {
  if (!firebaseReady) {
    const data = readLocal()
    data.bookings = data.bookings.map((item) => (item.booking_id === booking.booking_id ? { ...item, ...updates } : item))
    data.slotLocks = data.slotLocks.map((lock) =>
      lock.booking_ref === booking.booking_id ? { ...lock, status: updates.booking_status || lock.status } : lock,
    )
    if (updates.booking_status === 'Rejected') {
      data.slotLocks = data.slotLocks.filter((lock) => lock.booking_ref !== booking.booking_id)
    }
    writeLocal(data)
    return
  }

  await updateDoc(doc(db, 'bookings', booking.booking_id), updates)
  const locks = await getDocs(query(collection(db, 'slotLocks'), where('booking_ref', '==', booking.booking_id)))
  await Promise.all(locks.docs.map((lock) => {
    if (updates.booking_status === 'Rejected') return deleteDoc(doc(db, 'slotLocks', lock.id))
    return updateDoc(doc(db, 'slotLocks', lock.id), { status: updates.booking_status || lock.data().status })
  }))
}

export const saveSettings = async (settings) => {
  if (!firebaseReady) {
    const data = readLocal()
    data.settings = settings
    writeLocal(data)
    return
  }
  await setDoc(doc(db, 'settings', 'main'), settings, { merge: true })
}

export const saveSlot = async (slot) => {
  if (!firebaseReady) {
    const data = readLocal()
    data.slots = data.slots.some((item) => item.id === slot.id)
      ? data.slots.map((item) => (item.id === slot.id ? slot : item))
      : [...data.slots, slot]
    writeLocal(data)
    return
  }
  await setDoc(doc(db, 'slots', slot.id), slot, { merge: true })
}

export const removeSlot = async (slotId) => {
  if (!firebaseReady) {
    const data = readLocal()
    data.slots = data.slots.filter((slot) => slot.id !== slotId)
    writeLocal(data)
    return
  }
  await deleteDoc(doc(db, 'slots', slotId))
}
