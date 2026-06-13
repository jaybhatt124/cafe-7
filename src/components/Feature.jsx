export default function Feature({ icon, title, text }) {
  return (
    <article className="feature">
      {icon}
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  )
}
