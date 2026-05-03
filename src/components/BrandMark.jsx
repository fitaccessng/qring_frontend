export default function BrandMark({ className = "", alt = "Qring" }) {
  return (
    <img
      src="/qring_logo.png"
      alt={alt}
      className={className}
      draggable={false}
    />
  );
}

