import { useState } from 'react'
import { galleryImages } from '../data/gallery'

export default function Gallery() {
  const [filter, setFilter] = useState('All')
  const [preview, setPreview] = useState(null)
  const categories = ['All', 'Ground', 'Cafe', 'Events', 'Food']
  const shown = filter === 'All' ? galleryImages : galleryImages.filter((image) => image.category === filter)

  return (
    <section className="section">
      <div className="section-title">
        <p className="eyebrow">Gallery</p>
        <h2>Ground, cafe, and event moments.</h2>
      </div>
      <div className="filters">
        {categories.map((category) => (
          <button className={filter === category ? 'active' : ''} key={category} onClick={() => setFilter(category)}>{category}</button>
        ))}
      </div>
      <div className="gallery-grid">
        {shown.map((image) => (
          <button className="gallery-item" key={image.src} onClick={() => setPreview(image)}>
            <img src={image.src} alt={image.title} />
            <span>{image.title}</span>
          </button>
        ))}
      </div>
      {preview && (
        <button className="lightbox" onClick={() => setPreview(null)} aria-label="Close preview">
          <img src={preview.src} alt={preview.title} />
        </button>
      )}
    </section>
  )
}
