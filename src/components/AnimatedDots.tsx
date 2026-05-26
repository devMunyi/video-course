export function AnimatedDots() {
  return (
    <span className="inline-flex gap-[2px] ml-[2px]">
      {[0, 1, 2].map((i) => (
        <span key={i} className="animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}>
          .
        </span>
      ))}
    </span>
  )
}
