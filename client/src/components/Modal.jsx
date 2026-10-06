import { useEffect, useRef } from 'react';
import Icon from './Icon';

export default function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="sheet" aria-label={title} onCancel={onClose}><div className="sheet-handle" /><div className="section-heading"><h2>{title}</h2><button className="icon-button secondary" aria-label="ปิด" onClick={onClose}><Icon name="close" /></button></div>{children}</dialog>;
}
