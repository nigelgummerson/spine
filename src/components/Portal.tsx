import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
    children: React.ReactNode;
}

export const Portal = ({ children }: PortalProps) => {
    const triggerRef = useRef<Element | null>(document.activeElement);

    useEffect(() => {
        const trigger = triggerRef.current;
        return () => {
            if (trigger instanceof HTMLElement && trigger.isConnected) {
                trigger.focus();
            }
        };
    }, []);

    return createPortal(children, document.body);
};
