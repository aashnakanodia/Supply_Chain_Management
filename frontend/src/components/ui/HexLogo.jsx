export default function HexLogo({ size = 20 }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="24,9 37,16.5 37,31.5 24,39 11,31.5 11,16.5" stroke="#0e9f99" strokeWidth="1.2" fill="none" opacity=".2" strokeLinejoin="round"/>
      <line x1="24" y1="24" x2="37" y2="31.5" stroke="#0e9f99" strokeWidth="1.5" strokeLinecap="round" opacity=".18"/>
      <line x1="24" y1="24" x2="24" y2="39" stroke="#0e9f99" strokeWidth="1.5" strokeLinecap="round" opacity=".18"/>
      <line x1="24" y1="24" x2="11" y2="31.5" stroke="#0e9f99" strokeWidth="1.5" strokeLinecap="round" opacity=".18"/>
      <line x1="24" y1="24" x2="11" y2="16.5" stroke="#0e9f99" strokeWidth="1.5" strokeLinecap="round" opacity=".18"/>
      <line x1="24" y1="24" x2="24" y2="9" stroke="#2dd4cc" strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="24" y1="24" x2="37" y2="16.5" stroke="#2dd4cc" strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="24" y1="9" x2="37" y2="16.5" stroke="#2dd4cc" strokeWidth="2.2" strokeLinecap="round"/>
      <circle cx="37" cy="31.5" r="3" fill="#0e9f99" opacity=".22"/>
      <circle cx="24" cy="39" r="3" fill="#0e9f99" opacity=".22"/>
      <circle cx="11" cy="31.5" r="3" fill="#0e9f99" opacity=".22"/>
      <circle cx="11" cy="16.5" r="3" fill="#0e9f99" opacity=".22"/>
      <circle cx="24" cy="9" r="4.5" fill="#2dd4cc"/>
      <circle cx="37" cy="16.5" r="4.5" fill="#2dd4cc"/>
      <circle cx="24" cy="24" r="6.5" fill="#0e9f99" opacity=".65"/>
      <circle cx="24" cy="24" r="2.8" fill="#2dd4cc"/>
    </svg>
  )
}
