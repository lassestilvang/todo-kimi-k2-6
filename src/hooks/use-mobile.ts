import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)
  const isInitialized = React.useRef(false)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    // Set initial value on mount - safe because it only runs once
    if (!isInitialized.current) {
      isInitialized.current = true
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}