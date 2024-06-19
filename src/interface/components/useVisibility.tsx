import { useEffect, useRef, useState } from 'react';

interface Options {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
}

type UseVisibilityReturnType = [any | null, boolean];

const useVisibility = (options: Options): UseVisibilityReturnType => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const elementRef = useRef<Element | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, options);

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [elementRef, options]);

  return [elementRef, isVisible];
};

export default useVisibility;