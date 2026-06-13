export default function Info({ icon, label, value }) {
  return (
    <div className="info">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
